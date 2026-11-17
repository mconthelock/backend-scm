import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    Res,
    UseInterceptors,
    VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrdersService } from './orders.service.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { AcknowledgeOrderDto } from './dto/acknowledge-order.dto.js';
import { CreateShipmentScheduleDto } from './dto/create-shipment-schedule.dto.js';
import { UpdateShipmentScheduleDto } from './dto/update-shipment-schedule.dto.js';
import { CreateAsnDto } from './dto/create-asn.dto.js';
import { DockReceiveAsnDto } from './dto/dock-receive-asn.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Users } from '../entities/table/users.entity.js';
import { OrdersResponseInterceptor } from './interceptors/orders-response.interceptor.js';
import {
    UseForceTransaction,
    UseTransaction,
} from '../common/helpers/transaction.decorator.js';

function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
}

function getSessionId(req: Request): string {
    return (req.headers['x-session-id'] as string) || '#SESS-DEFAULT';
}

@Controller({
    path: 'orders',
    version: ['1', VERSION_NEUTRAL],
})
@UseInterceptors(OrdersResponseInterceptor)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    /**
     * 01. ดึงรายการ PO ทั้งหมด (Pagination, Sorting, Multi-filter)
     * GET /orders
     */
    @Get()
    findAll(@Query() query: QueryOrderDto) {
        return this.ordersService.findAll(query);
    }

    /**
     * 02. ดึงสรุปตัวเลขสถิติ KPI (Quick Metric Cards)
     * GET /orders/kpis
     */
    @Get('kpis')
    getKpis() {
        return this.ordersService.getKpis();
    }

    /**
     * 06. ดึงรายการงวดส่งมอบย่อยทั้งหมดของ Line Item นั้น
     * GET /orders/items/:itemId/shipments
     */
    @Get('items/:itemId/shipments')
    getShipmentsByItem(@Param('itemId') itemId: string) {
        return this.ordersService.getShipmentsByItem(+itemId);
    }

    /**
     * 07. สร้างงวดส่งมอบย่อย (Separate Shipment) สำหรับ Line Item
     * POST /orders/items/:itemId/shipments
     */
    @Post('items/:itemId/shipments')
    @HttpCode(HttpStatus.CREATED)
    createShipmentSchedule(
        @Param('itemId') itemId: string,
        @Body() dto: CreateShipmentScheduleDto,
    ) {
        return this.ordersService.createShipmentSchedule(+itemId, dto);
    }

    /**
     * 08. ปรับปรุงแก้ไขจำนวน หรือวันนัดส่งมอบของงวด
     * PUT /orders/shipments/:scheduleId
     */
    @Put('shipments/:scheduleId')
    updateShipmentSchedule(
        @Param('scheduleId') scheduleId: string,
        @Body() dto: UpdateShipmentScheduleDto,
    ) {
        return this.ordersService.updateShipmentSchedule(+scheduleId, dto);
    }

    /**
     * 09. ลบงวดส่งมอบ (ลบได้เฉพาะงวดที่ยังไม่ได้ออกใบ ASN)
     * DELETE /orders/shipments/:scheduleId
     */
    @Delete('shipments/:scheduleId')
    deleteShipmentSchedule(@Param('scheduleId') scheduleId: string) {
        return this.ordersService.deleteShipmentSchedule(+scheduleId);
    }

    /**
     * 10. สร้างใบ ASN ใหม่, ผูกรายการส่ง, ออก Barcode, ตัดยอดค้างส่ง (Atomic Transaction)
     * POST /orders/asns
     */
    @Post('asns')
    @HttpCode(HttpStatus.CREATED)
    @UseTransaction('dbConnection')
    @UseForceTransaction()
    createAsn(
        @Body() dto: CreateAsnDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        return this.ordersService.createAsn(
            dto,
            user,
            getClientIp(req),
            getSessionId(req),
        );
    }

    /**
     * 11. ดูรายละเอียดใบ ASN
     * GET /orders/asns/:asnNo
     */
    @Get('asns/:asnNo')
    getAsn(@Param('asnNo') asnNo: string) {
        return this.ordersService.getAsn(asnNo);
    }

    /**
     * 12. ดาวน์โหลดเอกสารใบส่งของพร้อมบาร์โค้ดสแกน (PDF)
     * GET /orders/asns/:asnNo/delivery-slip
     */
    @Get('asns/:asnNo/delivery-slip')
    async getAsnDeliverySlip(
        @Param('asnNo') asnNo: string,
        @Res() res: Response,
    ) {
        const buffer = await this.ordersService.getAsnDeliverySlip(asnNo);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="DeliverySlip_${asnNo}.pdf"`,
        );
        res.send(buffer);
    }

    /**
     * 13. สแกนบาร์โค้ดตรวจรับสินค้าหน้า Dock Gate B และบันทึกผลตรวจสอบ QA (Atomic Transaction)
     * PATCH /orders/asns/:asnNo/dock-receive
     */
    @Patch('asns/:asnNo/dock-receive')
    @UseTransaction('dbConnection')
    @UseForceTransaction()
    dockReceive(
        @Param('asnNo') asnNo: string,
        @Body() dto: DockReceiveAsnDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        return this.ordersService.dockReceiveAsn(
            asnNo,
            dto,
            user,
            getClientIp(req),
            getSessionId(req),
        );
    }

    /**
     * 03. ดึงข้อมูล PO ฉบับเต็ม (Header, Line Items, Balance, Milestones)
     * GET /orders/:id
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ordersService.findOne(id);
    }

    /**
     * 04. บันทึกประวัติการเปิดอ่านครั้งแรก (First Read)
     * POST /orders/:id/read
     */
    @Post(':id/read')
    recordFirstRead(
        @Param('id') id: string,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        return this.ordersService.recordFirstRead(
            id,
            user,
            getClientIp(req),
            getSessionId(req),
        );
    }

    /**
     * 05. Supplier กดยืนยันยอมรับคำสั่งซื้อ (E-Sign Acceptance)
     * POST /orders/:id/acknowledge
     */
    @Post(':id/acknowledge')
    acknowledgeOrder(
        @Param('id') id: string,
        @Body() dto: AcknowledgeOrderDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        return this.ordersService.acknowledgeOrder(
            id,
            dto,
            user,
            getClientIp(req),
            getSessionId(req),
        );
    }

    /**
     * 14. ดึงประวัติกิจกรรมการทำรายการทั้งหมด (ISO 9001 / J-SOX)
     * GET /orders/:id/audit-logs
     */
    @Get(':id/audit-logs')
    getAuditLogs(@Param('id') id: string) {
        return this.ordersService.getAuditLogs(id);
    }

    /**
     * 15. ส่งออกประวัติ Audit Trail เป็นไฟล์ .csv
     * GET /orders/:id/audit-logs/export
     */
    @Get(':id/audit-logs/export')
    async exportAuditLogsCsv(
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const csvData = await this.ordersService.exportAuditLogsCsv(id);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Audit_PO_${id}.csv"`,
        );
        res.send(csvData);
    }

    /**
     * 16. ดาวน์โหลดใบสั่งซื้อฉบับทางการเป็นไฟล์ PDF
     * GET /orders/:id/export/pdf
     */
    @Get(':id/export/pdf')
    async exportPoPdf(
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const buffer = await this.ordersService.exportPoPdf(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="PO_${id}.pdf"`,
        );
        res.send(buffer);
    }

    /**
     * 17. ส่งออกแพ็กเกจข้อมูลโครงสร้าง EDI (XML / JSON EDIFACT 850)
     * GET /orders/:id/export/edi
     */
    @Get(':id/export/edi')
    exportPoEdi(@Param('id') id: string) {
        return this.ordersService.exportPoEdi(id);
    }
}
