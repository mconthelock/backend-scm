import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../common/helpers/base-repository.js';
import { Orders } from '../entities/table/orders.entity.js';
import { OrdersDetail } from '../entities/table/orders_detail.js';
import { OrdersShipmentSchedule } from '../entities/table/orders-shipment-schedule.entity.js';
import { AdvanceShippingNotice } from '../entities/table/advance-shipping-notice.entity.js';
import { AsnItem } from '../entities/table/asn-item.entity.js';
import { OrdersAuditLog } from '../entities/table/orders-audit-log.entity.js';

@Injectable()
export class OrdersRepository extends BaseRepository {
    constructor(@InjectDataSource('dbConnection') ds: DataSource) {
        super(ds);
    }

    get ordersRepo() {
        return this.getRepository(Orders);
    }

    get ordersDetailRepo() {
        return this.getRepository(OrdersDetail);
    }

    get scheduleRepo() {
        return this.getRepository(OrdersShipmentSchedule);
    }

    get asnRepo() {
        return this.getRepository(AdvanceShippingNotice);
    }

    get asnItemRepo() {
        return this.getRepository(AsnItem);
    }

    get auditLogRepo() {
        return this.getRepository(OrdersAuditLog);
    }

    async findOrderByIdOrPoNo(idOrPoNo: number | string) {
        const qb = this.ordersRepo
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.details', 'details')
            .leftJoinAndSelect('details.shipmentSchedules', 'schedules');

        if (typeof idOrPoNo === 'number' || !isNaN(Number(idOrPoNo))) {
            qb.where('order.ORD_ID = :id', { id: Number(idOrPoNo) });
        } else {
            qb.where('order.ORD_PONO = :poNo', { poNo: idOrPoNo });
        }

        return qb.getOne();
    }

    async findDetailById(itemId: number) {
        return this.ordersDetailRepo.findOne({
            where: { ORDD_ID: itemId },
            relations: {
                shipmentSchedules: true,
                order: true,
            },
        });
    }

    async findSchedulesByItemId(itemId: number) {
        return this.scheduleRepo.find({
            where: { PO_ITEM_ID: itemId },
            order: { SPLIT_SEQ: 'ASC' },
        });
    }

    async findScheduleById(scheduleId: number) {
        return this.scheduleRepo.findOne({
            where: { ID: scheduleId },
            relations: { orderDetail: true },
        });
    }

    async saveSchedule(data: Partial<OrdersShipmentSchedule>) {
        const entity = this.scheduleRepo.create(data);
        return this.scheduleRepo.save(entity);
    }

    async deleteSchedule(scheduleId: number) {
        return this.scheduleRepo.delete({ ID: scheduleId });
    }

    async findAsnByNo(asnNo: string) {
        return this.asnRepo.findOne({
            where: { ASN_NO: asnNo },
            relations: { items: true },
        });
    }

    async saveAsn(data: Partial<AdvanceShippingNotice>) {
        const entity = this.asnRepo.create(data);
        return this.asnRepo.save(entity);
    }

    async saveAsnItems(data: Partial<AsnItem>[]) {
        const entities = this.asnItemRepo.create(data);
        return this.asnItemRepo.save(entities);
    }

    async saveAuditLog(data: Partial<OrdersAuditLog>) {
        // Audit log เป็นแบบ Insert-Only ตามกฎ Audit Trail Immutability
        const entity = this.auditLogRepo.create(data);
        return this.auditLogRepo.save(entity);
    }

    async findAuditLogsByPoId(poId: number) {
        return this.auditLogRepo.find({
            where: { PO_ID: poId },
            order: { CREATED_AT: 'DESC' },
        });
    }
}
