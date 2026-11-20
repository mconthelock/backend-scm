import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrdersRepository } from './orders.repository.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { AcknowledgeOrderDto } from './dto/acknowledge-order.dto.js';
import { CreateShipmentScheduleDto } from './dto/create-shipment-schedule.dto.js';
import { UpdateShipmentScheduleDto } from './dto/update-shipment-schedule.dto.js';
import { CreateAsnDto } from './dto/create-asn.dto.js';
import { DockReceiveAsnDto } from './dto/dock-receive-asn.dto.js';
import {
    OrderStatusCodeMap,
    OrderStatusNameMap,
} from './dto/order-status.enum.js';
import { Users } from '../entities/table/users.entity.js';
import {
    formatOrderList,
    generateAuditLogsCsv,
    generateDeliverySlipPdf,
    generateEdi850,
    generatePurchaseOrderPdf,
} from './orders.helper.js';
import { SearchOrdersDto } from './dto/search-orders.dto.js';
import { applyDynamicFilters } from '../common/helpers/query.helper.js';

@Injectable()
export class OrdersService {
    constructor(private readonly ordersRepo: OrdersRepository) {}

    async search(query: SearchOrdersDto) {
        const { page: rawPage, limit: rawLimit, ...rawFilters } = query;
        const page = rawPage && rawPage > 0 ? Number(rawPage) : 1;
        const limit = rawLimit && rawLimit > 0 ? Number(rawLimit) : 10;
        const skip = (page - 1) * limit;

        const filters = Object.fromEntries(
            Object.entries(rawFilters).filter(([, v]) => v !== undefined),
        );

        const qb = this.ordersRepo.ordersRepo
            .createQueryBuilder('ord')
            .leftJoinAndSelect('ord.details', 'details');
        await applyDynamicFilters(qb, filters, 'ord');

        qb.orderBy('ord.ORD_PODATE', 'DESC').skip(skip).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            data: formatOrderList(items),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    /**
     * 01. ดึงรายการ PO ทั้งหมด พร้อม Pagination, Sorting และ Multi-filter
     */
    async findAll(query: QueryOrderDto) {
        const page = query.page && query.page > 0 ? Number(query.page) : 1;
        const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
        const skip = (page - 1) * limit;

        const qb = this.ordersRepo.ordersRepo
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.details', 'details');

        if (query.search) {
            const kw = `%${query.search.trim()}%`;
            qb.andWhere(
                '(order.ORD_PONO LIKE :kw OR order.ORD_REFNO LIKE :kw OR details.ORDD_ITEM LIKE :kw OR details.ORDD_ITEMCODE LIKE :kw OR details.ORDD_DESCRIPTION LIKE :kw)',
                { kw },
            );
        }

        if (query.status) {
            const statusCode = OrderStatusCodeMap[query.status.toUpperCase()];
            if (statusCode !== undefined) {
                qb.andWhere('order.ORD_STATUS = :status', {
                    status: statusCode,
                });
            }
        }

        if (query.startDate) {
            qb.andWhere('order.ORD_PODATE >= :startDate', {
                startDate: new Date(query.startDate),
            });
        }

        if (query.endDate) {
            qb.andWhere('order.ORD_PODATE <= :endDate', {
                endDate: new Date(query.endDate),
            });
        }

        if (query.plantCode) {
            qb.andWhere('order.ORD_SHIPTO = :plantCode', {
                plantCode: query.plantCode,
            });
        }

        qb.orderBy('order.ORD_PODATE', 'DESC').skip(skip).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            data: formatOrderList(items),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    /**
     * 02. ดึงสรุปตัวเลขสถิติ KPI (Quick Metric Cards)
     */
    async getKpis() {
        const repo = this.ordersRepo.ordersRepo;

        const [pendingAcknowledgment, inProduction, pendingAsnDispatch] =
            await Promise.all([
                // Pending Ack: สถานะ 1 (ISSUED) หรือ 2 (READ)
                repo
                    .createQueryBuilder('o')
                    .where('o.ORD_STATUS IN (:...statuses)', {
                        statuses: [1, 2],
                    })
                    .getCount(),
                // In Production: สถานะ 3 (ACKNOWLEDGED) หรือ 4 (PARTIAL_SHIPPED)
                repo
                    .createQueryBuilder('o')
                    .where('o.ORD_STATUS IN (:...statuses)', {
                        statuses: [3, 4],
                    })
                    .getCount(),
                // Pending ASN Dispatch: กำหนดส่งภายใน 3 วัน หรือมีงวดที่รอส่ง
                this.ordersRepo.scheduleRepo
                    .createQueryBuilder('s')
                    .where("s.STATUS = 'SCHEDULED' AND s.ASN_NO IS NULL")
                    .getCount(),
            ]);

        // Urgent Action: คำสั่งซื้อที่ใกล้ครบกำหนดส่งหรือรอ Acknowledge เกินกำหนด
        const urgentCount = await repo
            .createQueryBuilder('o')
            .where('o.ORD_STATUS IN (:...statuses)', { statuses: [1, 2] })
            .andWhere('o.ORD_PODATE < :yesterday', {
                yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000),
            })
            .getCount();

        return {
            pendingAcknowledgment,
            inProduction,
            pendingAsnDispatch,
            urgentActionRequired: urgentCount,
        };
    }

    /**
     * 03. ดึงข้อมูล PO ฉบับเต็ม (Header, Items, Balance, Shipment Schedules)
     */
    async findOne(idOrPoNo: number | string) {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        const statusName = OrderStatusNameMap[order.ORD_STATUS] || 'ISSUED';

        const items = (order.details || []).map((d) => {
            const orderedQty = Number(d.ORDD_QTY);
            const shippedQty = Number(d.ORDD_SHIPPED_QTY || 0);
            const remainingQty = Math.max(0, orderedQty - shippedQty);
            const receivedQty = Number(d.ORDD_RECEIVED_QTY || 0);

            return {
                id: d.ORDD_ID,
                lineNo: d.ORDD_LINE,
                partNo: d.ORDD_ITEMCODE || d.ORDD_ITEM || '',
                description: d.ORDD_DESCRIPTION,
                extraDesc: d.ORDD_EXTRADESC || null,
                drawingNo: d.ORDD_DRAWING || null,
                boi: d.ORDD_BOI || null,
                orderedQty,
                shippedQty,
                remainingQty,
                receivedQty,
                unit: d.ORDD_UNIT,
                unitPrice: Number(d.ORDD_PRICE),
                dueDate: d.ORDD_DUEDATE
                    ? new Date(d.ORDD_DUEDATE).toISOString().split('T')[0]
                    : '',
                status: d.ORDD_STATUS,
                buyerComment: d.ORDD_BUYERCOMMENT,
                vendorComment: d.ORDD_VENDORCOMMENT,
                shipmentSchedules: (d.shipmentSchedules || []).map((s) => ({
                    scheduleId: s.ID,
                    splitSeq: s.SPLIT_SEQ,
                    scheduledQty: Number(s.SCHEDULED_QTY),
                    promisedShipDate: s.PROMISED_SHIP_DATE,
                    estimatedArrivalDate: s.ESTIMATED_ARRIVAL_DATE,
                    vendorRemarks: s.VENDOR_REMARKS,
                    status: s.STATUS,
                    asnNo: s.ASN_NO,
                })),
            };
        });

        return {
            id: order.ORD_ID,
            poNo: order.ORD_PONO,
            revision: order.ORD_REVISION,
            docRev: order.ORD_DOCREV,
            type: order.ORD_TYPE,
            issueDate: order.ORD_PODATE
                ? new Date(order.ORD_PODATE).toISOString().split('T')[0]
                : '',
            plantCode: order.ORD_SHIPTO || 'Amata Plant 2',
            dockGate: 'Gate B Dock',
            status: statusName,
            currency: order.ORD_CURRENCY,
            totalAmount: Number(order.ORD_AMOUNT || 0),
            paymentTerms: order.ORD_PAYMENT,
            tradeTerms: order.ORD_TRADE,
            vendorCode: order.VENDORCODE,
            vendorId: order.VENDOR,
            buyerCode: order.BUYERCODE,
            buyerName: order.BUYER,
            buyerComment: order.ORD_BUYERCOMMENT,
            vendorComment: order.ORD_VENDORCOMMENT,
            isRead: Boolean(order.FIRST_READ_AT),
            firstReadAt: order.FIRST_READ_AT,
            acknowledgedAt: order.ACKNOWLEDGED_AT,
            items,
        };
    }

    /**
     * 04. บันทึกประวัติการเปิดอ่านครั้งแรก (First Read)
     */
    async recordFirstRead(
        idOrPoNo: number | string,
        currentUser?: Users,
        ipAddress = '127.0.0.1',
        sessionId = '#SESS-DEFAULT',
    ) {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        const now = new Date();

        if (!order.FIRST_READ_AT) {
            order.FIRST_READ_AT = now;
            order.FIRST_READ_BY = currentUser?.USR_ID || null;

            if (order.ORD_STATUS === 1) {
                // เปลี่ยนสถานะจาก 1 (ISSUED) เป็น 2 (READ)
                order.ORD_STATUS = 2;
            }

            await this.ordersRepo.ordersRepo.save(order);

            // บันทึก Audit Log (Insert-Only)
            await this.ordersRepo.saveAuditLog({
                PO_ID: order.ORD_ID,
                WORKFLOW_EVENT: 'First Read / Opened by Supplier',
                ACTION_CODE: 'SUPPLIER_READ',
                ACTOR_NAME: currentUser?.USR_NAME || 'Supplier User',
                ACTOR_ORG: order.VENDORCODE || 'Supplier Partner',
                IP_ADDRESS: ipAddress,
                SESSION_ID: sessionId,
                DETAILS: 'Opened PO document via extranet web session',
                STATUS: 'Read',
            });
        }

        return {
            recorded: true,
            firstReadAt: order.FIRST_READ_AT,
        };
    }

    /**
     * 05. Supplier กดยืนยันยอมรับคำสั่งซื้อ (E-Sign Acceptance)
     */
    async acknowledgeOrder(
        idOrPoNo: number | string,
        dto: AcknowledgeOrderDto,
        currentUser?: Users,
        ipAddress = '127.0.0.1',
        sessionId = '#SESS-DEFAULT',
    ) {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        const now = new Date();
        order.ORD_STATUS = 3; // ACKNOWLEDGED
        order.ACKNOWLEDGED_AT = now;
        order.ACKNOWLEDGED_BY = currentUser?.USR_ID || null;

        if (dto.vendorComment) {
            order.ORD_VENDORCOMMENT = dto.vendorComment;
        }

        await this.ordersRepo.ordersRepo.save(order);

        // คำนวณ SHA-256 Hash สำหรับ E-Sign และ Non-repudiation
        const hashInput = `${order.ORD_PONO}|${order.ORD_ID}|${dto.signerName}|${dto.signerPosition}|${now.toISOString()}`;
        const digitalHash =
            dto.digitalSignatureHash ||
            crypto.createHash('sha256').update(hashInput).digest('hex');

        // บันทึก Audit Log (Insert-Only)
        await this.ordersRepo.saveAuditLog({
            PO_ID: order.ORD_ID,
            WORKFLOW_EVENT: 'PO Acknowledged / E-Signed',
            ACTION_CODE: 'PO_ACKNOWLEDGE',
            ACTOR_NAME: dto.signerName,
            ACTOR_ORG: dto.signerPosition,
            IP_ADDRESS: ipAddress,
            SESSION_ID: sessionId,
            DETAILS: dto.vendorComment || 'Acknowledged order acceptance',
            STATUS: 'ACKNOWLEDGED',
            HASH: digitalHash,
        });

        return {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: now.toISOString(),
        };
    }

    /**
     * 06. ดึงรายการงวดส่งมอบย่อยทั้งหมดของ Line Item
     */
    async getShipmentsByItem(itemId: number) {
        const item = await this.ordersRepo.findDetailById(itemId);
        if (!item) {
            throw new NotFoundException(
                `ไม่พบรายการสินค้า Line Item ID #${itemId}`,
            );
        }

        const schedules = await this.ordersRepo.findSchedulesByItemId(itemId);
        return schedules.map((s) => ({
            scheduleId: s.ID,
            poItemId: s.PO_ITEM_ID,
            splitSeq: s.SPLIT_SEQ,
            scheduledQty: Number(s.SCHEDULED_QTY),
            promisedShipDate: s.PROMISED_SHIP_DATE,
            estimatedArrivalDate: s.ESTIMATED_ARRIVAL_DATE,
            vendorRemarks: s.VENDOR_REMARKS,
            status: s.STATUS,
            asnNo: s.ASN_NO,
        }));
    }

    /**
     * 07. สร้างงวดส่งมอบย่อย (Separate Shipment)
     */
    async createShipmentSchedule(
        itemId: number,
        dto: CreateShipmentScheduleDto,
    ) {
        const item = await this.ordersRepo.findDetailById(itemId);
        if (!item) {
            throw new NotFoundException(
                `ไม่พบรายการสินค้า Line Item ID #${itemId}`,
            );
        }

        // 1. ตรวจสอบว่า estimatedArrivalDate >= promisedShipDate
        if (
            new Date(dto.estimatedArrivalDate) < new Date(dto.promisedShipDate)
        ) {
            throw new BadRequestException(
                'วันประมาณการถึงปลายทาง (estimatedArrivalDate) ต้องไม่น้อยกว่าวันนัดส่ง (promisedShipDate)',
            );
        }

        // 2. ตรวจสอบยอดรวม scheduledQty ทุกงวด ต้องไม่เกินยอดสั่งซื้อ ORDD_QTY
        const existingSchedules =
            await this.ordersRepo.findSchedulesByItemId(itemId);
        const currentTotal = existingSchedules.reduce(
            (sum, s) => sum + Number(s.SCHEDULED_QTY),
            0,
        );
        const newTotal = Number(
            (currentTotal + Number(dto.scheduledQty)).toFixed(4),
        );
        const maxOrderedQty = Number(Number(item.ORDD_QTY).toFixed(4));

        if (newTotal > maxOrderedQty) {
            throw new BadRequestException(
                `ยอดรวมการแบ่งงวดส่ง (${newTotal}) เกินยอดสั่งซื้อรวม (${maxOrderedQty})`,
            );
        }

        const nextSeq = existingSchedules.length + 1;
        const saved = await this.ordersRepo.saveSchedule({
            PO_ITEM_ID: itemId,
            SPLIT_SEQ: nextSeq,
            SCHEDULED_QTY: dto.scheduledQty,
            PROMISED_SHIP_DATE: dto.promisedShipDate,
            ESTIMATED_ARRIVAL_DATE: dto.estimatedArrivalDate,
            VENDOR_REMARKS: dto.vendorRemarks || null,
            STATUS: 'SCHEDULED',
        });

        return {
            scheduleId: saved.ID,
            poItemId: saved.PO_ITEM_ID,
            splitSeq: saved.SPLIT_SEQ,
            scheduledQty: Number(saved.SCHEDULED_QTY),
            promisedShipDate: saved.PROMISED_SHIP_DATE,
            estimatedArrivalDate: saved.ESTIMATED_ARRIVAL_DATE,
            status: saved.STATUS,
        };
    }

    /**
     * 08. ปรับปรุงแก้ไขจำนวน หรือวันนัดส่งมอบของงวด
     */
    async updateShipmentSchedule(
        scheduleId: number,
        dto: UpdateShipmentScheduleDto,
    ) {
        const schedule = await this.ordersRepo.findScheduleById(scheduleId);
        if (!schedule) {
            throw new NotFoundException(`ไม่พบงวดส่งมอบ ID #${scheduleId}`);
        }

        if (schedule.ASN_NO || schedule.STATUS !== 'SCHEDULED') {
            throw new BadRequestException(
                'ไม่สามารถแก้ไขงวดส่งมอบที่ผูกกับใบ ASN หรือถูกส่งมอบไปแล้วได้',
            );
        }

        if (dto.promisedShipDate && dto.estimatedArrivalDate) {
            if (
                new Date(dto.estimatedArrivalDate) <
                new Date(dto.promisedShipDate)
            ) {
                throw new BadRequestException(
                    'วันประมาณการถึงปลายทาง ต้องไม่น้อยกว่าวันนัดส่ง',
                );
            }
        }

        if (dto.scheduledQty !== undefined) {
            const allSchedules = await this.ordersRepo.findSchedulesByItemId(
                schedule.PO_ITEM_ID,
            );
            const otherSum = allSchedules
                .filter((s) => s.ID !== scheduleId)
                .reduce((sum, s) => sum + Number(s.SCHEDULED_QTY), 0);

            const item = await this.ordersRepo.findDetailById(
                schedule.PO_ITEM_ID,
            );
            const maxOrderedQty = Number(item?.ORDD_QTY || 0);

            if (otherSum + dto.scheduledQty > maxOrderedQty) {
                throw new BadRequestException(
                    `ยอดรวมการแบ่งงวดส่ง (${otherSum + dto.scheduledQty}) เกินยอดสั่งซื้อ (${maxOrderedQty})`,
                );
            }
            schedule.SCHEDULED_QTY = dto.scheduledQty;
        }

        if (dto.promisedShipDate)
            schedule.PROMISED_SHIP_DATE = dto.promisedShipDate;
        if (dto.estimatedArrivalDate)
            schedule.ESTIMATED_ARRIVAL_DATE = dto.estimatedArrivalDate;
        if (dto.vendorRemarks !== undefined)
            schedule.VENDOR_REMARKS = dto.vendorRemarks;
        schedule.UPDATED_AT = new Date();

        const updated = await this.ordersRepo.scheduleRepo.save(schedule);

        return {
            scheduleId: updated.ID,
            poItemId: updated.PO_ITEM_ID,
            splitSeq: updated.SPLIT_SEQ,
            scheduledQty: Number(updated.SCHEDULED_QTY),
            promisedShipDate: updated.PROMISED_SHIP_DATE,
            estimatedArrivalDate: updated.ESTIMATED_ARRIVAL_DATE,
            status: updated.STATUS,
        };
    }

    /**
     * 09. ลบงวดส่งมอบ
     */
    async deleteShipmentSchedule(scheduleId: number) {
        const schedule = await this.ordersRepo.findScheduleById(scheduleId);
        if (!schedule) {
            throw new NotFoundException(`ไม่พบงวดส่งมอบ ID #${scheduleId}`);
        }

        if (schedule.ASN_NO || schedule.STATUS !== 'SCHEDULED') {
            throw new BadRequestException(
                'ไม่สามารถลบงวดส่งมอบที่ผูกกับใบ ASN หรือถูกส่งมอบไปแล้วได้',
            );
        }

        await this.ordersRepo.deleteSchedule(scheduleId);
        return { success: true, message: 'ลบงวดส่งมอบเรียบร้อยแล้ว' };
    }

    /**
     * 10. สร้างใบ ASN ใหม่, ผูกรายการส่ง, ออก Barcode, และตัดยอดค้างส่ง (Atomic Transaction)
     */
    async createAsn(
        dto: CreateAsnDto,
        currentUser?: Users,
        ipAddress = '127.0.0.1',
        sessionId = '#SESS-DEFAULT',
    ) {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(dto.poId);
        if (!order) {
            throw new NotFoundException(
                `ไม่พบข้อมูลคำสั่งซื้อ ID #${dto.poId}`,
            );
        }

        const now = new Date();
        const year = now.getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const asnNo = `ASN-${year}-${randomNum}`;
        const plateClean = dto.truckPlateNo.replace(/[^a-zA-Z0-9]/g, '');
        const barcodeToken = `AMEC-ASN-${year}${randomNum}-${plateClean}`;

        // บันทึก ASN Header
        await this.ordersRepo.saveAsn({
            ASN_NO: asnNo,
            PO_ID: order.ORD_ID,
            BARCODE_TOKEN: barcodeToken,
            CARRIER_NAME: dto.carrierName,
            TRUCK_PLATE_NO: dto.truckPlateNo,
            DRIVER_NAME: dto.driverName,
            DRIVER_PHONE: dto.driverPhone,
            DISPATCH_TIME: new Date(dto.dispatchTime),
            ESTIMATED_ARRIVAL_TIME: new Date(dto.estimatedArrivalTime),
            RECEIVING_DOCK: dto.receivingDock || 'Gate B Dock',
            STATUS: 'CREATED',
        });

        // บันทึก ASN Items และตัดยอดใน ORDERS_DETAIL
        const asnItemsData = dto.items.map((item) => ({
            ASN_NO: asnNo,
            PO_ITEM_ID: item.poItemId,
            SHIPMENT_SCHEDULE_ID: item.shipmentScheduleId || null,
            DISPATCH_QTY: item.dispatchQty,
            RECEIVED_QTY: 0,
            REJECTED_QTY: 0,
            LOT_BATCH_NO: item.lotBatchNo || null,
            PACKAGE_CRATE_NO: item.packageCrateNo || null,
            QA_STATUS: 'PENDING',
        }));
        await this.ordersRepo.saveAsnItems(asnItemsData);

        for (const itemDto of dto.items) {
            const lineDetail = await this.ordersRepo.findDetailById(
                itemDto.poItemId,
            );
            if (lineDetail) {
                lineDetail.ORDD_SHIPPED_QTY = Number(
                    (
                        Number(lineDetail.ORDD_SHIPPED_QTY || 0) +
                        Number(itemDto.dispatchQty)
                    ).toFixed(4),
                );
                await this.ordersRepo.ordersDetailRepo.save(lineDetail);
            }

            if (itemDto.shipmentScheduleId) {
                const sched = await this.ordersRepo.findScheduleById(
                    itemDto.shipmentScheduleId,
                );
                if (sched) {
                    sched.STATUS = 'DISPATCHED';
                    sched.ASN_NO = asnNo;
                    sched.UPDATED_AT = now;
                    await this.ordersRepo.scheduleRepo.save(sched);
                }
            }
        }

        // ตรวจสอบยอดคงเหลือทุกรายการเพื่อปรับสถานะ PO
        const refreshedOrder = await this.ordersRepo.findOrderByIdOrPoNo(
            order.ORD_ID,
        );
        const allCompleted = (refreshedOrder?.details || []).every(
            (d) => Number(d.ORDD_SHIPPED_QTY || 0) >= Number(d.ORDD_QTY),
        );

        refreshedOrder!.ORD_STATUS = allCompleted ? 5 : 4; // 5: SHIPPED, 4: PARTIAL_SHIPPED
        await this.ordersRepo.ordersRepo.save(refreshedOrder!);

        // บันทึก Audit Log (Insert-Only)
        await this.ordersRepo.saveAuditLog({
            PO_ID: order.ORD_ID,
            WORKFLOW_EVENT: 'ASN Generated & Dispatched',
            ACTION_CODE: 'ASN_GENERATED',
            ACTOR_NAME: currentUser?.USR_NAME || dto.driverName,
            ACTOR_ORG: dto.carrierName,
            IP_ADDRESS: ipAddress,
            SESSION_ID: sessionId,
            DETAILS: `Created ASN ${asnNo} with ${dto.items.length} items. Barcode: ${barcodeToken}`,
            STATUS: allCompleted ? 'SHIPPED' : 'PARTIAL_SHIPPED',
        });

        return {
            asnNo,
            barcodeToken,
            status: 'CREATED',
            createdAt: now.toISOString(),
        };
    }

    /**
     * 11. ดูรายละเอียดใบ ASN
     */
    async getAsn(asnNo: string) {
        const asn = await this.ordersRepo.findAsnByNo(asnNo);
        if (!asn) {
            throw new NotFoundException(`ไม่พบข้อมูลใบ ASN เลขที่ '${asnNo}'`);
        }

        return {
            asnNo: asn.ASN_NO,
            poId: asn.PO_ID,
            barcodeToken: asn.BARCODE_TOKEN,
            carrierName: asn.CARRIER_NAME,
            truckPlateNo: asn.TRUCK_PLATE_NO,
            driverName: asn.DRIVER_NAME,
            driverPhone: asn.DRIVER_PHONE,
            dispatchTime: asn.DISPATCH_TIME,
            estimatedArrivalTime: asn.ESTIMATED_ARRIVAL_TIME,
            actualArrivalTime: asn.ACTUAL_ARRIVAL_TIME,
            receivingDock: asn.RECEIVING_DOCK,
            status: asn.STATUS,
            receiveTime: asn.RECEIVE_TIME,
            createdAt: asn.CREATED_AT,
            items: (asn.items || []).map((i) => ({
                id: i.ID,
                poItemId: i.PO_ITEM_ID,
                shipmentScheduleId: i.SHIPMENT_SCHEDULE_ID,
                dispatchQty: Number(i.DISPATCH_QTY),
                receivedQty: Number(i.RECEIVED_QTY),
                rejectedQty: Number(i.REJECTED_QTY),
                lotBatchNo: i.LOT_BATCH_NO,
                packageCrateNo: i.PACKAGE_CRATE_NO,
                qaStatus: i.QA_STATUS,
            })),
        };
    }

    /**
     * 12. ดาวน์โหลดเอกสารใบส่งของพร้อมบาร์โค้ดสแกน (PDF)
     */
    async getAsnDeliverySlip(asnNo: string): Promise<Buffer> {
        const asn = await this.ordersRepo.findAsnByNo(asnNo);
        if (!asn) {
            throw new NotFoundException(`ไม่พบข้อมูลใบ ASN เลขที่ '${asnNo}'`);
        }

        return generateDeliverySlipPdf(asn);
    }

    /**
     * 13. เจ้าหน้าที่ AMEC Gate Dock สแกนบาร์โค้ดรับสินค้าและบันทึกผลตรวจสอบ QA (Atomic Transaction)
     */
    async dockReceiveAsn(
        asnNo: string,
        dto: DockReceiveAsnDto,
        currentUser?: Users,
        ipAddress = '127.0.0.1',
        sessionId = '#SESS-DEFAULT',
    ) {
        const asn = await this.ordersRepo.findAsnByNo(asnNo);
        if (!asn) {
            throw new NotFoundException(`ไม่พบข้อมูลใบ ASN เลขที่ '${asnNo}'`);
        }

        const now = new Date();
        asn.ACTUAL_ARRIVAL_TIME = new Date(dto.actualArrivalTime);
        asn.RECEIVE_TIME = now;
        asn.STATUS = 'RECEIVED';
        await this.ordersRepo.asnRepo.save(asn);

        for (const receivedItem of dto.items) {
            const asnItem = (asn.items || []).find(
                (i) => i.PO_ITEM_ID === receivedItem.poItemId,
            );
            if (asnItem) {
                asnItem.RECEIVED_QTY = receivedItem.receivedQty;
                asnItem.REJECTED_QTY = receivedItem.rejectedQty || 0;
                asnItem.QA_STATUS = receivedItem.qaStatus || 'PASSED';
                await this.ordersRepo.asnItemRepo.save(asnItem);
            }

            const lineItem = await this.ordersRepo.findDetailById(
                receivedItem.poItemId,
            );
            if (lineItem) {
                lineItem.ORDD_RECEIVED_QTY = Number(
                    (
                        Number(lineItem.ORDD_RECEIVED_QTY || 0) +
                        Number(receivedItem.receivedQty)
                    ).toFixed(4),
                );
                await this.ordersRepo.ordersDetailRepo.save(lineItem);
            }
        }

        // บันทึก Audit Log (Insert-Only)
        await this.ordersRepo.saveAuditLog({
            PO_ID: asn.PO_ID,
            WORKFLOW_EVENT: 'Dock Receiving & QA Inspection Completed',
            ACTION_CODE: 'DOCK_RECEIVE',
            ACTOR_NAME: currentUser?.USR_NAME || 'Dock Inspector',
            ACTOR_ORG: 'AMEC Dock Gate B',
            IP_ADDRESS: ipAddress,
            SESSION_ID: sessionId,
            DETAILS: `Received ASN ${asnNo} at Gate B. Inspection passed.`,
            STATUS: 'RECEIVED',
        });

        return {
            asnNo: asn.ASN_NO,
            status: 'RECEIVED',
            receivedAt: now.toISOString(),
        };
    }

    /**
     * 14. ดึงประวัติกิจกรรมการทำรายการทั้งหมด (Audit Logs)
     */
    async getAuditLogs(idOrPoNo: number | string) {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        const logs = await this.ordersRepo.findAuditLogsByPoId(order.ORD_ID);
        return {
            data: logs.map((l) => ({
                id: l.ID,
                timestamp: l.CREATED_AT
                    ? new Date(l.CREATED_AT).toISOString()
                    : '',
                workflowEvent: l.WORKFLOW_EVENT,
                actionCode: l.ACTION_CODE,
                actorName: l.ACTOR_NAME,
                actorOrg: l.ACTOR_ORG,
                ipAddress: l.IP_ADDRESS,
                sessionId: l.SESSION_ID,
                details: l.DETAILS,
                status: l.STATUS,
            })),
        };
    }

    /**
     * 15. ส่งออกประวัติ Audit Trail เป็นไฟล์ CSV
     */
    async exportAuditLogsCsv(idOrPoNo: number | string): Promise<string> {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        const logs = await this.ordersRepo.findAuditLogsByPoId(order.ORD_ID);
        return generateAuditLogsCsv(logs);
    }

    /**
     * 16. ดาวน์โหลดใบสั่งซื้อฉบับทางการเป็นไฟล์ PDF
     */
    async exportPoPdf(idOrPoNo: number | string): Promise<Buffer> {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        return generatePurchaseOrderPdf(order);
    }

    /**
     * 17. ส่งออกข้อมูลโครงสร้าง EDI (XML / JSON EDIFACT 850)
     */
    async exportPoEdi(idOrPoNo: number | string) {
        const order = await this.ordersRepo.findOrderByIdOrPoNo(idOrPoNo);
        if (!order) {
            throw new NotFoundException(`ไม่พบข้อมูลคำสั่งซื้อ '${idOrPoNo}'`);
        }

        return generateEdi850(order);
    }
}
