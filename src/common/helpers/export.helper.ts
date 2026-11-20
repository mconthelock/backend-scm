export type CsvCellValue = string | number | boolean | null | undefined;

/**
 * แปลงข้อมูลหัวตารางและแถวเป็นข้อความ CSV ตามมาตรฐาน RFC 4180 (พร้อม UTF-8 BOM สำหรับ Excel)
 */
export function generateCsv(headers: string[], rows: CsvCellValue[][]): string {
    const escapeCsv = (val: CsvCellValue): string => {
        if (val === null || val === undefined) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
    };

    const csvLines = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row) => row.map(escapeCsv).join(',')),
    ];

    return '\uFEFF' + csvLines.join('\r\n');
}

/**
 * สร้างไฟล์ PDF แบบพื้นฐานตามมาตรฐาน PDF 1.4 โดยไม่ต้องใช้ library ภายนอก
 */
export function generateSimplePdf(title: string, lines: string[]): Buffer {
    const textLines = [
        title,
        '========================================',
        ...lines,
    ];
    const streamContent = textLines
        .map(
            (line, idx) =>
                `1 0 0 1 50 ${750 - idx * 20} Tm (${line.replace(/[()\\]/g, '\\$&')}) Tj`,
        )
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
    const obj5 =
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

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

    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 0; i < 5; i++) {
        xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }

    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    pdfParts.push(xref);
    pdfParts.push(trailer);

    return Buffer.from(pdfParts.join(''), 'utf-8');
}
