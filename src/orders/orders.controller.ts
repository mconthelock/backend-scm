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
    VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrdersService } from './orders.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Users } from '../entities/table/users.entity.js';
import {
    paginatedResponse,
    successResponse,
} from '../common/helpers/response.helper.js';
import {
    UseForceTransaction,
    UseTransaction,
} from '../common/helpers/transaction.decorator.js';

import { SearchOrdersDto } from './dto/search-orders.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { AcknowledgeOrderDto } from './dto/acknowledge-order.dto.js';
import { CreateShipmentScheduleDto } from './dto/create-shipment-schedule.dto.js';
import { UpdateShipmentScheduleDto } from './dto/update-shipment-schedule.dto.js';
import { CreateAsnDto } from './dto/create-asn.dto.js';
import { DockReceiveAsnDto } from './dto/dock-receive-asn.dto.js';

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
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    /**
     * 01. ดึงรายการ PO ทั้งหมด (Pagination, Sorting, Multi-filter)
     * GET /orders
     */
    @Get()
    async findAll(@Query() query: QueryOrderDto) {
        const { data, pagination } = await this.ordersService.findAll(query);
        return paginatedResponse(data, pagination);
    }

    @Post('search')
    @HttpCode(HttpStatus.OK)
    async search(@Body() query: SearchOrdersDto) {
        const { data, pagination } = await this.ordersService.search(query);
        return paginatedResponse(data, pagination);
    }

    /**
     * 02. ดึงสรุปตัวเลขสถิติ KPI (Quick Metric Cards)
     * GET /orders/kpis
     */
    @Get('kpis')
    async getKpis() {
        const data = await this.ordersService.getKpis();
        return successResponse(data);
    }

    /**
     * 06. ดึงรายการงวดส่งมอบย่อยทั้งหมดของ Line Item นั้น
     * GET /orders/items/:itemId/shipments
     */
    @Get('items/:itemId/shipments')
    async getShipmentsByItem(@Param('itemId') itemId: string) {
        const data = await this.ordersService.getShipmentsByItem(+itemId);
        return successResponse(data);
    }

    /**
     * 07. สร้างงวดส่งมอบย่อย (Separate Shipment) สำหรับ Line Item
     * POST /orders/items/:itemId/shipments
     */
    @Post('items/:itemId/shipments')
    @HttpCode(HttpStatus.CREATED)
    async createShipmentSchedule(
        @Param('itemId') itemId: string,
        @Body() dto: CreateShipmentScheduleDto,
    ) {
        const data = await this.ordersService.createShipmentSchedule(
            +itemId,
            dto,
        );
        return successResponse(
            data,
            'Shipment schedule created successfully',
            HttpStatus.CREATED,
        );
    }

    /**
     * 08. ปรับปรุงแก้ไขจำนวน หรือวันนัดส่งมอบของงวด
     * PUT /orders/shipments/:scheduleId
     */
    @Put('shipments/:scheduleId')
    async updateShipmentSchedule(
        @Param('scheduleId') scheduleId: string,
        @Body() dto: UpdateShipmentScheduleDto,
    ) {
        const data = await this.ordersService.updateShipmentSchedule(
            +scheduleId,
            dto,
        );
        return successResponse(data, 'Shipment schedule updated successfully');
    }

    /**
     * 09. ลบงวดส่งมอบ (ลบได้เฉพาะงวดที่ยังไม่ได้ออกใบ ASN)
     * DELETE /orders/shipments/:scheduleId
     */
    @Delete('shipments/:scheduleId')
    async deleteShipmentSchedule(@Param('scheduleId') scheduleId: string) {
        const result =
            await this.ordersService.deleteShipmentSchedule(+scheduleId);
        return successResponse(null, result.message);
    }

    /**
     * 10. สร้างใบ ASN ใหม่, ผูกรายการส่ง, ออก Barcode, ตัดยอดค้างส่ง (Atomic Transaction)
     * POST /orders/asns
     */
    @Post('asns')
    @HttpCode(HttpStatus.CREATED)
    @UseTransaction('dbConnection')
    @UseForceTransaction()
    async createAsn(
        @Body() dto: CreateAsnDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        const data = await this.ordersService.createAsn(
            dto,
            user,
            getClientIp(req),
            getSessionId(req),
        );
        return successResponse(
            data,
            'ASN created successfully',
            HttpStatus.CREATED,
        );
    }

    /**
     * 11. ดูรายละเอียดใบ ASN
     * GET /orders/asns/:asnNo
     */
    @Get('asns/:asnNo')
    async getAsn(@Param('asnNo') asnNo: string) {
        const data = await this.ordersService.getAsn(asnNo);
        return successResponse(data);
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
    async dockReceive(
        @Param('asnNo') asnNo: string,
        @Body() dto: DockReceiveAsnDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        const data = await this.ordersService.dockReceiveAsn(
            asnNo,
            dto,
            user,
            getClientIp(req),
            getSessionId(req),
        );
        return successResponse(data, 'Dock receive recorded successfully');
    }

    /**
     * 03. ดึงข้อมูล PO ฉบับเต็ม (Header, Line Items, Balance, Milestones)
     * GET /orders/:id
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const data = await this.ordersService.findOne(id);
        return successResponse(data);
    }

    /**
     * 04. บันทึกประวัติการเปิดอ่านครั้งแรก (First Read)
     * POST /orders/:id/read
     */
    @Post(':id/read')
    @HttpCode(HttpStatus.OK)
    async recordFirstRead(
        @Param('id') id: string,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        const data = await this.ordersService.recordFirstRead(
            id,
            user,
            getClientIp(req),
            getSessionId(req),
        );
        return successResponse(data);
    }

    /**
     * 05. Supplier กดยืนยันยอมรับคำสั่งซื้อ (E-Sign Acceptance)
     * POST /orders/:id/acknowledge
     */
    @Post(':id/acknowledge')
    @HttpCode(HttpStatus.OK)
    async acknowledgeOrder(
        @Param('id') id: string,
        @Body() dto: AcknowledgeOrderDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        const data = await this.ordersService.acknowledgeOrder(
            id,
            dto,
            user,
            getClientIp(req),
            getSessionId(req),
        );
        return successResponse(data, 'Order acknowledged successfully');
    }

    /**
     * 14. ดึงประวัติกิจกรรมการทำรายการทั้งหมด (ISO 9001 / J-SOX)
     * GET /orders/:id/audit-logs
     */
    @Get(':id/audit-logs')
    async getAuditLogs(@Param('id') id: string) {
        const { data } = await this.ordersService.getAuditLogs(id);
        return successResponse(data);
    }

    /**
     * 15. ส่งออกประวัติ Audit Trail เป็นไฟล์ .csv
     * GET /orders/:id/audit-logs/export
     */
    @Get(':id/audit-logs/export')
    async exportAuditLogsCsv(@Param('id') id: string, @Res() res: Response) {
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
    async exportPoPdf(@Param('id') id: string, @Res() res: Response) {
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
    async exportPoEdi(@Param('id') id: string) {
        const data = await this.ordersService.exportPoEdi(id);
        return successResponse(data);
    }
}
