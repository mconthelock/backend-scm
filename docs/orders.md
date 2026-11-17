|  #  | Module   |  Method  | Endpoint Path                            | สิทธิ์การเข้าถึง (Roles)        | คำอธิบายการทำงาน (Summary)                                             |
| :-: | -------- | :------: | ---------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| 01  | Orders   |  `GET`   | `/api/v1/orders`                         | Supplier, Buyer, Admin          | ดึงรายการ PO ทั้งหมด พร้อม Pagination, Sorting และ Multi-filter        |
| 02  | Orders   |  `GET`   | `/api/v1/orders/kpis`                    | Supplier, Buyer                 | ดึงสรุปตัวเลขสถิติ KPI (เช่น Pending Ack, In Production, Overdue)      |
| 03  | Orders   |  `GET`   | `/api/v1/orders/:id`                     | Supplier, Buyer, QC             | ดึงข้อมูล PO ฉบับเต็ม (Header, Line Items, Balance, Milestones)        |
| 04  | Orders   |  `POST`  | `/api/v1/orders/:id/read`                | Supplier                        | บันทึกประวัติการเปิดอ่านครั้งแรก (First Read) พร้อม IP และ Session     |
| 05  | Orders   |  `POST`  | `/api/v1/orders/:id/acknowledge`         | Supplier (Authorized Signer)    | กดยืนยันคำสั่งซื้อ (E-Sign Acceptance) เปลี่ยนสถานะเป็น `ACKNOWLEDGED` |
| 06  | Shipment |  `GET`   | `/api/v1/orders/items/:itemId/shipments` | Supplier, Buyer                 | ดึงรายการงวดส่งมอบย่อยทั้งหมดของ Line Item นั้น                        |
| 07  | Shipment |  `POST`  | `/api/v1/orders/items/:itemId/shipments` | Supplier                        | สร้างงวดส่งมอบย่อย (Separate Shipment) สำหรับ Line Item นั้น           |
| 08  | Shipment |  `PUT`   | `/api/v1/shipments/:scheduleId`          | Supplier                        | ปรับปรุงแก้ไขจำนวน หรือวันนัดส่งมอบของงวด                              |
| 09  | Shipment | `DELETE` | `/api/v1/shipments/:scheduleId`          | Supplier                        | ลบงวดส่งมอบ (ลบได้เฉพาะงวดที่ยังไม่ได้ออกใบ ASN)                       |
| 10  | ASN      |  `POST`  | `/api/v1/asns`                           | Supplier                        | สร้างใบ ASN ใหม่, ผูกรายการส่ง, ออก Barcode, และตัดยอดค้างส่ง          |
| 11  | ASN      |  `GET`   | `/api/v1/asns/:asnNo`                    | Supplier, Buyer, AMEC Dock      | ดูรายละเอียดใบ ASN, ข้อมูลคนขับ, ทะเบียนรถ, รายการสินค้า และ CoA       |
| 12  | ASN      |  `GET`   | `/api/v1/asns/:asnNo/delivery-slip`      | Supplier, AMEC Dock             | ดาวน์โหลดเอกสารใบส่งของพร้อมบาร์โค้ดสแกน (PDF)                         |
| 13  | ASN      | `PATCH`  | `/api/v1/asns/:asnNo/dock-receive`       | AMEC Dock Inspector, QC         | สแกนบาร์โค้ดตรวจรับสินค้าหน้า Dock Gate B และบันทึกผลตรวจสอบ QA        |
| 14  | Audit    |  `GET`   | `/api/v1/orders/:id/audit-logs`          | Supplier, Buyer, Admin, Auditor | ดึงประวัติกิจกรรมการทำรายการทั้งหมด (ISO 9001 / J-SOX)                 |
| 15  | Audit    |  `GET`   | `/api/v1/orders/:id/audit-logs/export`   | Supplier, Buyer, Auditor        | ส่งออกประวัติ Audit Trail เป็นไฟล์ `.csv`                              |
| 16  | Export   |  `GET`   | `/api/v1/orders/:id/export/pdf`          | Supplier, Buyer                 | ดาวน์โหลดใบสั่งซื้อฉบับทางการเป็นไฟล์ PDF พร้อมตรายางระบบ              |
| 17  | Export   |  `GET`   | `/api/v1/orders/:id/export/edi`          | Supplier System, EDI            | ส่งออกแพ็กเกจข้อมูลโครงสร้าง EDI (XML / JSON EDIFACT 850)              |
