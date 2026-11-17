import { Orders } from '../../entities/table/orders.entity.js';
import { OrdersAuditLog } from '../../entities/table/orders-audit-log.entity.js';
import { AdvanceShippingNotice } from '../../entities/table/advance-shipping-notice.entity.js';

/**
 * แปลงรายการ Audit Logs เป็นไฟล์ CSV ตามมาตรฐาน RFC 4180
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

    const escapeCsv = (str: string | number | null | undefined): string => {
        if (str === null || str === undefined) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    const rows = logs.map((log) => [
        escapeCsv(log.ID),
        escapeCsv(log.CREATED_AT ? new Date(log.CREATED_AT).toISOString() : ''),
        escapeCsv(log.WORKFLOW_EVENT),
        escapeCsv(log.ACTION_CODE),
        escapeCsv(log.ACTOR_NAME),
        escapeCsv(log.ACTOR_ORG),
        escapeCsv(log.IP_ADDRESS),
        escapeCsv(log.SESSION_ID),
        escapeCsv(log.DETAILS),
        escapeCsv(log.STATUS),
    ]);

    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join(
        '\r\n',
    );
    // เพิ่ม UTF-8 BOM สำหรับเปิดใน Excel
    return '\uFEFF' + csvContent;
}

/**
 * สร้างไฟล์ PDF แบบพื้นฐานตามมาตรฐาน PDF 1.4 โดยไม่ต้องใช้ library ภายนอก
 */
export function generateSimplePdf(title: string, lines: string[]): Buffer {
    const textLines = [title, '========================================', ...lines];
    const streamContent = textLines
        .map((line, idx) => `1 0 0 1 50 ${750 - idx * 20} Tm (${line.replace(/[()\\]/g, '\\$&')}) Tj`)
        .join('\n');

    const stream = `BT\n/F1 12 Tf\n${streamContent}\nET`;
    const streamLength = Buffer.byteLength(stream, 'utf-8');

    const pdfParts: string[] = [];
    pdfParts.push('%PDF-1.4\n');

    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 =
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
    const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`;
    const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

    let offset = pdfParts[0].length;
    const offsets = [offset];

    pdfParts.push(obj1);
    offset += Buffer.byteLength(obj1, 'utf-8');
    offsets.push(offset);

    pdfParts.push(obj2);
    offset += Buffer.byteLength(obj2, 'utf-8');
    offsets.push(offset);

    pdfParts.push(obj3);
    offset += Buffer.byteLength(obj3, 'utf-8');
    offsets.push(offset);

    pdfParts.push(obj4);
    offset += Buffer.byteLength(obj4, 'utf-8');
    offsets.push(offset);

    pdfParts.push(obj5);
    offset += Buffer.byteLength(obj5, 'utf-8');
    const startXref = offset;

    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    for (let i = 0; i < 5; i++) {
        xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }

    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    pdfParts.push(xref);
    pdfParts.push(trailer);

    return Buffer.from(pdfParts.join(''), 'utf-8');
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

    return generateSimplePdf('AMEC - ADVANCE SHIPPING NOTICE (DELIVERY SLIP)', lines);
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

    return generateSimplePdf('MITSUBISHI ELECTRIC (AMEC) - PURCHASE ORDER', lines);
}

/**
 * ส่งออกโครงสร้าง EDIFACT 850 (Purchase Order)
 */
export function generateEdi850(order: Orders) {
    const segments: string[] = [
        'UNA:+.? \'',
        `UNB+UNOC:3+AMEC:ZZZ+${order.VENDORCODE}:ZZZ+${new Date().toISOString().slice(2, 10).replace(/-/g, '')}:1000+0001'`,
        'UNH+1+ORDERS:D:01B:UN:EAN008\'',
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
        'UNZ+1+0001\'',
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
