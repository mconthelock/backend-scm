import { Orders } from '../entities/table/orders.entity.js';
import { OrdersAuditLog } from '../entities/table/orders-audit-log.entity.js';
import { AdvanceShippingNotice } from '../entities/table/advance-shipping-notice.entity.js';
import { OrderStatusNameMap } from './dto/order-status.enum.js';
import {
    generateCsv,
    generateSimplePdf,
} from '../common/helpers/export.helper.js';

/**
 * แปลง Entity Orders 1 รายการให้อยู่ในรูปแบบ Summary สำหรับตารางรายการ PO
 */
export function formatOrderSummary(o: Orders, now: Date = new Date()) {
    let targetDeliveryDate: string | null = null;
    if (o.details && o.details.length > 0) {
        const dates = o.details
            .map((d) => d.ORDD_DUEDATE)
            .filter((d) => Boolean(d))
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        if (dates.length > 0) {
            targetDeliveryDate = new Date(dates[0]).toISOString().split('T')[0];
        }
    }

    // SLA 24 ชั่วโมงหลังจากวันออก PO
    const poDate = o.ORD_PODATE
        ? new Date(o.ORD_PODATE).getTime()
        : now.getTime();
    const slaDeadline = poDate + 24 * 60 * 60 * 1000;
    const slaRemainingHours = Math.max(
        0,
        Number(((slaDeadline - now.getTime()) / (1000 * 60 * 60)).toFixed(1)),
    );

    const statusName = OrderStatusNameMap[o.ORD_STATUS] || 'ISSUED';

    return {
        id: o.ORD_ID,
        poNo: o.ORD_PONO,
        revision: o.ORD_REVISION,
        issueDate: o.ORD_PODATE
            ? new Date(o.ORD_PODATE).toISOString().split('T')[0]
            : '',
        targetDeliveryDate: targetDeliveryDate || '',
        plantCode: o.ORD_SHIPTO || 'Amata Plant 2',
        dockGate: 'Gate B Dock',
        status: statusName,
        itemCount: o.details?.length || 0,
        totalAmount: Number(o.ORD_AMOUNT || 0),
        currency: o.ORD_CURRENCY || 'THB',
        isRead: Boolean(o.FIRST_READ_AT),
        slaRemainingHours,
    };
}

/**
 * แปลงรายการ Entity Orders เป็น Array ของ Summary สำหรับหน้าตาราง PO
 */
export function formatOrderList(items: Orders[]) {
    const now = new Date();
    return items.map((o) => formatOrderSummary(o, now));
}

/**
 * แปลงรายการ Audit Logs ของ PO เป็นไฟล์ CSV
 */
export function generateAuditLogsCsv(logs: OrdersAuditLog[]): string {
    const headers = [
        'ID',
        'Timestamp',
        'Workflow Event',
        'Action Code',
        'Actor Name',
        'Actor Org',
        'IP Address',
        'Session ID',
        'Details',
        'Status',
    ];

    const rows = logs.map((log) => [
        log.ID,
        log.CREATED_AT ? new Date(log.CREATED_AT).toISOString() : '',
        log.WORKFLOW_EVENT,
        log.ACTION_CODE,
        log.ACTOR_NAME,
        log.ACTOR_ORG,
        log.IP_ADDRESS,
        log.SESSION_ID,
        log.DETAILS,
        log.STATUS,
    ]);

    return generateCsv(headers, rows);
}

/**
 * สร้าง PDF ใบส่งของพร้อมบาร์โค้ดสแกน (Delivery Slip)
 */
export function generateDeliverySlipPdf(asn: AdvanceShippingNotice): Buffer {
    const lines = [
        `ASN Number: ${asn.ASN_NO}`,
        `Barcode Token: ${asn.BARCODE_TOKEN}`,
        `Carrier: ${asn.CARRIER_NAME}`,
        `Truck Plate No: ${asn.TRUCK_PLATE_NO}`,
        `Driver: ${asn.DRIVER_NAME} (Tel: ${asn.DRIVER_PHONE})`,
        `Receiving Dock: ${asn.RECEIVING_DOCK}`,
        `Dispatch Time: ${new Date(asn.DISPATCH_TIME).toLocaleString()}`,
        `Estimated Arrival: ${new Date(asn.ESTIMATED_ARRIVAL_TIME).toLocaleString()}`,
        `Status: ${asn.STATUS}`,
        '----------------------------------------',
        'Items in shipment:',
        ...(asn.items || []).map(
            (item, index) =>
                ` ${index + 1}. Item #${item.PO_ITEM_ID} | Batch: ${item.LOT_BATCH_NO || '-'} | Crate: ${item.PACKAGE_CRATE_NO || '-'} | Dispatch Qty: ${Number(item.DISPATCH_QTY).toFixed(4)}`,
        ),
    ];

    return generateSimplePdf(
        'AMEC - ADVANCE SHIPPING NOTICE (DELIVERY SLIP)',
        lines,
    );
}

/**
 * สร้าง PDF ใบสั่งซื้อฉบับทางการ (PO Official Document)
 */
export function generatePurchaseOrderPdf(order: Orders): Buffer {
    const lines = [
        `PO Number: ${order.ORD_PONO}`,
        `Revision: ${order.ORD_REVISION} (Doc Rev: ${order.ORD_DOCREV})`,
        `PO Date: ${order.ORD_PODATE ? new Date(order.ORD_PODATE).toISOString().split('T')[0] : '-'}`,
        `Vendor Code: ${order.VENDORCODE}`,
        `Currency: ${order.ORD_CURRENCY}`,
        `Total Amount: ${Number(order.ORD_AMOUNT || 0).toFixed(4)} ${order.ORD_CURRENCY}`,
        `Payment Term: ${order.ORD_PAYMENT || '-'}`,
        `Trade Term: ${order.ORD_TRADE || '-'}`,
        `Ship To: ${order.ORD_SHIPTO || '-'}`,
        `Ship By: ${order.ORD_SHIPBY || '-'}`,
        `Buyer: ${order.BUYER || order.BUYERCODE || '-'}`,
        `Status: ${order.ORD_STATUS}`,
        '----------------------------------------',
        'Line Items:',
        ...(order.details || []).map(
            (detail) =>
                ` Line ${detail.ORDD_LINE}: ${detail.ORDD_ITEMCODE || detail.ORDD_ITEM || '-'} | ${detail.ORDD_DESCRIPTION} | Qty: ${Number(detail.ORDD_QTY).toFixed(4)} ${detail.ORDD_UNIT} | Price: ${Number(detail.ORDD_PRICE).toFixed(4)}`,
        ),
    ];

    return generateSimplePdf(
        'MITSUBISHI ELECTRIC (AMEC) - PURCHASE ORDER',
        lines,
    );
}

/**
 * ส่งออกโครงสร้าง EDIFACT 850 (Purchase Order)
 */
export function generateEdi850(order: Orders) {
    const segments: string[] = [
        "UNA:+.? '",
        `UNB+UNOC:3+AMEC:ZZZ+${order.VENDORCODE}:ZZZ+${new Date().toISOString().slice(2, 10).replace(/-/g, '')}:1000+0001'`,
        "UNH+1+ORDERS:D:01B:UN:EAN008'",
        `BGM+220+${order.ORD_PONO}+9'`,
        `DTM+137:${order.ORD_PODATE ? new Date(order.ORD_PODATE).toISOString().slice(0, 10).replace(/-/g, '') : ''}:102'`,
        `NAD+BY+AMEC::92'`,
        `NAD+SU+${order.VENDORCODE}::92'`,
        `CUX+2:${order.ORD_CURRENCY}:4'`,
        ...(order.details || []).flatMap((d) => [
            `LIN+${d.ORDD_LINE}++${d.ORDD_ITEMCODE || d.ORDD_ITEM}:IN'`,
            `IMD+F++:::${d.ORDD_DESCRIPTION.replace(/'/g, '')}'`,
            `QTY+21:${Number(d.ORDD_QTY).toFixed(4)}:${d.ORDD_UNIT}'`,
            `PRI+AAA:${Number(d.ORDD_PRICE).toFixed(4)}'`,
        ]),
        `UNS+S'`,
        `CNT+2:${order.details?.length || 0}'`,
        `UNT+${(order.details?.length || 0) * 4 + 10}+1'`,
        "UNZ+1+0001'",
    ];

    return {
        format: 'EDIFACT_850',
        version: 'D:01B',
        rawEdi: segments.join('\n'),
        jsonEdi: {
            interchangeHeader: {
                sender: 'AMEC',
                recipient: order.VENDORCODE,
                date: new Date().toISOString(),
            },
            messageHeader: {
                messageType: 'ORDERS',
                orderNumber: order.ORD_PONO,
                revision: order.ORD_REVISION,
                issueDate: order.ORD_PODATE,
                currency: order.ORD_CURRENCY,
                totalAmount: order.ORD_AMOUNT,
                vendorCode: order.VENDORCODE,
            },
            lineItems: (order.details || []).map((d) => ({
                lineNo: d.ORDD_LINE,
                partNo: d.ORDD_ITEMCODE || d.ORDD_ITEM,
                description: d.ORDD_DESCRIPTION,
                quantity: Number(d.ORDD_QTY),
                unit: d.ORDD_UNIT,
                unitPrice: Number(d.ORDD_PRICE),
                dueDate: d.ORDD_DUEDATE,
            })),
        },
    };
}
