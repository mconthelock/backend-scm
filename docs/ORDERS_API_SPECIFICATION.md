# เอกสารข้อกำหนดระบบ API (API Specification Document for Backend Team)
**Project:** Mitsubishi Electric Supplier Portal (AMEC) — Purchase Order & ASN System  
**Module:** Orders (`/orders`)  
**Framework:** NestJS (TypeScript)  
**Version:** 2.2.0  
**Target Audience:** Backend Engineering Team, QA Team, API Integration Partners  

---

## 1. ข้อมูลพื้นฐานทางเทคนิค (Base Technical Specifications)

- **Base URL:** `https://supplier-portal.amec.mitsubishielectric.co.th/orders`
- **Route Prefix:** `/orders` (ไม่มี `/api/v1`)
- **Authentication:** `Bearer Token` (JWT ผ่าน Header: `Authorization: Bearer <access_token>`)
- **Audit Headers (ส่งอัตโนมัติจาก Frontend):**
  - `X-Session-ID`: Extranet session identifier (เช่น `#SESS-89210`)
  - `X-Forwarded-For`: IP Address ของผู้ใช้งานจริง
- **Standard JSON Response Envelope:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation successful",
    "data": {},
    "timestamp": "2026-11-17T23:15:00+07:00"
  }
  ```

---

## 2. ตารางสรุปรายการ Endpoints ทั้งหมด (Master Endpoint Matrix)

| # | หมวดหมู่ (Category) | Method | Endpoint Path | สิทธิ์การเข้าถึง (Roles) | คำอธิบายการทำงาน (Summary) |
| :-: | :--- | :---: | :--- | :--- | :--- |
| **01** | **Orders Master** | `GET` | `/orders` | Supplier, Buyer, Admin | ดึงรายการ PO ทั้งหมด พร้อม Pagination, Sorting และ Multi-filter |
| **02** | **Orders Master** | `GET` | `/orders/kpis` | Supplier, Buyer | ดึงสรุปตัวเลขสถิติ KPI (เช่น Pending Ack, In Production, Overdue) |
| **03** | **Orders Master** | `GET` | `/orders/:id` | Supplier, Buyer, QC | ดึงข้อมูล PO ฉบับเต็ม (Header, Line Items, Balance, Milestones) |
| **04** | **Lifecycle & Audit** | `POST` | `/orders/:id/read` | Supplier | บันทึกประวัติการเปิดอ่านครั้งแรก (First Read) พร้อม IP และ Session |
| **05** | **Lifecycle & Audit** | `POST` | `/orders/:id/acknowledge` | Supplier (Authorized) | กดยืนยันคำสั่งซื้อ (E-Sign Acceptance) เปลี่ยนสถานะเป็น `ACKNOWLEDGED` |
| **06** | **Separate Shipment**| `GET` | `/orders/items/:itemId/shipments` | Supplier, Buyer | ดึงรายการงวดส่งมอบย่อยทั้งหมดของ Line Item นั้น |
| **07** | **Separate Shipment**| `POST` | `/orders/items/:itemId/shipments` | Supplier | **สร้างงวดส่งมอบย่อย (Separate Shipment)** สำหรับ Line Item นั้น |
| **08** | **Separate Shipment**| `PUT` | `/orders/shipments/:scheduleId` | Supplier | ปรับปรุงแก้ไขจำนวน หรือวันนัดส่งมอบของงวด |
| **09** | **Separate Shipment**| `DELETE`| `/orders/shipments/:scheduleId` | Supplier | ลบงวดส่งมอบ (ลบได้เฉพาะงวดที่ยังไม่ได้ออกใบ ASN) |
| **10** | **ASN Management** | `POST` | `/orders/asns` | Supplier | **สร้างใบ ASN ใหม่**, ผูกรายการส่ง, ออก Barcode, และตัดยอดค้างส่ง |
| **11** | **ASN Management** | `GET` | `/orders/asns/:asnNo` | Supplier, Buyer, AMEC Dock | ดูรายละเอียดใบ ASN, ข้อมูลคนขับ, ทะเบียนรถ, รายการสินค้า และ CoA |
| **12** | **ASN Management** | `GET` | `/orders/asns/:asnNo/delivery-slip`| Supplier, AMEC Dock | ดาวน์โหลดเอกสารใบส่งของพร้อมบาร์โค้ดสแกน (PDF) |
| **13** | **ASN Management** | `PATCH`| `/orders/asns/:asnNo/dock-receive` | AMEC Dock, QC | สแกนบาร์โค้ดตรวจรับสินค้าหน้า Dock Gate B และบันทึกผลตรวจสอบ QA |
| **14** | **Compliance Logs** | `GET` | `/orders/:id/audit-logs` | Supplier, Buyer, Auditor | ดึงประวัติกิจกรรมการทำรายการทั้งหมด (ISO 9001 / J-SOX) |
| **15** | **Compliance Logs** | `GET` | `/orders/:id/audit-logs/export` | Supplier, Buyer, Auditor | ส่งออกประวัติ Audit Trail เป็นไฟล์ `.csv` |
| **16** | **Export Services** | `GET` | `/orders/:id/export/pdf` | Supplier, Buyer | ดาวน์โหลดใบสั่งซื้อฉบับทางการเป็นไฟล์ PDF พร้อมตราประทับระบบ |
| **17** | **Export Services** | `GET` | `/orders/:id/export/edi` | Supplier System, EDI | ส่งออกข้อมูลโครงสร้าง EDI (XML / JSON EDIFACT 850) |

---

## 3. รายละเอียดเชิงลึกของแต่ละ Endpoint (Detailed Endpoint Specs)

### หมวด 1: Purchase Order Master

#### 1. `GET /orders`
- **คำอธิบาย:** ดึงรายการคำสั่งซื้อหลักสำหรับตารางในหน้า `orders`
- **Query Parameters:**
  - `search` *(string, optional)*: คำค้นหาใน `PO_NO`, `PART_NO`, `PART_DESCRIPTION`
  - `status` *(string, optional)*: `ISSUED`, `READ`, `ACKNOWLEDGED`, `PARTIAL_SHIPPED`, `SHIPPED`, `CLOSED`
  - `startDate` / `endDate` *(date YYYY-MM-DD, optional)*: วันที่ออก PO
  - `plantCode` *(string, optional)*: กรองตามโรงงานปลายทาง เช่น `Amata Plant 2`
  - `page` *(number, default 1)*, `limit` *(number, default 10)*
- **Response Success (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 102,
        "poNo": "PO-2025-0892",
        "revision": 0,
        "issueDate": "2025-02-17",
        "targetDeliveryDate": "2025-02-28",
        "plantCode": "Amata Plant 2",
        "dockGate": "Gate B Dock",
        "status": "ISSUED",
        "itemCount": 5,
        "totalAmount": 3450000.00,
        "currency": "THB",
        "isRead": false,
        "slaRemainingHours": 4.2
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
  }
  ```

#### 2. `GET /orders/kpis`
- **คำอธิบาย:** สรุปตัวเลขสถิติบน Quick Metric Cards (Header)
- **Response Success (200 OK):**
  ```json
  {
    "pendingAcknowledgment": 3,
    "inProduction": 12,
    "pendingAsnDispatch": 5,
    "urgentActionRequired": 2
  }
  ```

#### 3. `GET /orders/:id`
- **คำอธิบาย:** ดึงข้อมูลรายละเอียด PO สำหรับหน้า `orders_detail` รวมทั้ง Items, Balance, Drawing References, และประวัติการจัดส่ง
- **Path Parameter:** `id` *(number)* - รหัส `ORDERS.ORD_ID` หรือ `PO_NO`
- **Response Success (200 OK):** แสดงโครงสร้าง Header ครบถ้วนพร้อม Array รายการ `items` และ Array `shipmentSchedules` ภายในแต่ละ Item

---

### หมวด 2: Read Receipt & Acknowledge Acceptance

#### 4. `POST /orders/:id/read`
- **คำอธิบาย:** บันทึกประวัติการเปิดอ่านครั้งแรกของ Supplier
- **Logic สำหรับ Backend:**
  - ตรวจสอบว่า `ORDERS.FIRST_READ_AT` มีค่าหรือยัง หากยังไม่มี:
    1. อัปเดต `FIRST_READ_AT = NOW()`, `FIRST_READ_BY = currentUser.id`
    2. ถ้า `STATUS == 'ISSUED'` ให้อัปเดต `STATUS = 'READ'`
    3. Insert ข้อมูลลงตาราง `PO_AUDIT_LOGS` (`ACTION_CODE = 'SUPPLIER_READ'`, เก็บ IP, Session, Timestamp)
- **Response Success (200 OK):**
  ```json
  {
    "recorded": true,
    "firstReadAt": "2026-11-17T23:15:00+07:00"
  }
  ```

#### 5. `POST /orders/:id/acknowledge`
- **คำอธิบาย:** Supplier กดยืนยันยอมรับคำสั่งซื้อ (E-Sign Acceptance)
- **Request Body (JSON):**
  ```json
  {
    "signerName": "Mr. Somchai R.",
    "signerPosition": "Managing Director",
    "vendorComment": "Accepted delivery schedule for Amata City Plant 2.",
    "digitalSignatureHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
  ```
- **Logic สำหรับ Backend:**
  - เปลี่ยนสถานะ PO เป็น `ACKNOWLEDGED`
  - บันทึก `ACKNOWLEDGED_AT = NOW()`, `ACKNOWLEDGED_BY = currentUser.id`
  - บันทึก Audit Log พร้อมคำนวณ SHA-256 Hash เพื่อป้องกันการปฏิเสธความรับผิดชอบ (Non-repudiation)
- **Response Success (200 OK):**
  ```json
  {
    "status": "ACKNOWLEDGED",
    "acknowledgedAt": "2026-11-17T23:15:00+07:00"
  }
  ```

---

### หมวด 3: Separate Shipment per Line Item (การแยกงวดส่งมอบ)

#### 6. `GET /orders/items/:itemId/shipments`
- **คำอธิบาย:** ดึงรายการงวดส่งมอบย่อยทั้งหมดของ Line Item ที่ระบุ

#### 7. `POST /orders/items/:itemId/shipments`
- **คำอธิบาย:** **สร้างงวดส่งมอบย่อยของแต่ละ Line Item** (เช่น Line 1 สั่ง 400 ชิ้น แบ่งส่งเป็น Lot 1 = 200 ชิ้น และ Lot 2 = 200 ชิ้น)
- **Path Parameter:** `itemId` *(number)* - รหัส ID ของ Line Item (`PO_ITEMS.ID`)
- **Request Body (JSON):**
  ```json
  {
    "scheduledQty": 200.0000,
    "promisedShipDate": "2026-12-05",
    "estimatedArrivalDate": "2026-12-06",
    "vendorRemarks": "Lot 1: First assembly batch"
  }
  ```
- **Business Validations ที่ Backend ต้องตรวจสอบ:**
  1. ยอดรวมของ `scheduledQty` ทุกงวดใน Line Item นี้ ต้องไม่เกินยอดสั่งซื้อ `ORDERED_QTY`
  2. `estimatedArrivalDate` ต้องไม่น้อยกว่า `promisedShipDate`
- **Response Success (201 Created):**
  ```json
  {
    "scheduleId": 1001,
    "poItemId": 501,
    "splitSeq": 1,
    "scheduledQty": 200.0000,
    "promisedShipDate": "2026-12-05",
    "estimatedArrivalDate": "2026-12-06",
    "status": "SCHEDULED"
  }
  ```

#### 8. `PUT /orders/shipments/:scheduleId`
- **คำอธิบาย:** แก้ไขจำนวนหรือวันนัดส่งของงวด (แก้ไขได้เฉพาะงวดที่สถานะยังเป็น `SCHEDULED` และยังไม่ได้ผูกกับ ASN ที่ส่งออกไปแล้ว)

#### 9. `DELETE /orders/shipments/:scheduleId`
- **คำอธิบาย:** ลบงวดส่งมอบย่อย (หากผูกกับ ASN แล้ว จะไม่อนุญาตให้ลบ `400 Bad Request`)

---

### หมวด 4: Advance Shipping Notice (ASN) Management

#### 10. `POST /orders/asns`
- **คำอธิบาย:** ออกใบแจ้งการจัดส่งล่วงหน้า ผูกกับข้อมูลรถขนส่ง และตัดยอดคงเหลือของ Line Items
- **Request Body (JSON):**
  ```json
  {
    "poId": 102,
    "carrierName": "Kerry Logistics",
    "truckPlateNo": "71-8890 BKK",
    "driverName": "Mr. Narong P.",
    "driverPhone": "081-234-5678",
    "dispatchTime": "2026-12-05T08:30:00+07:00",
    "estimatedArrivalTime": "2026-12-05T14:00:00+07:00",
    "receivingDock": "Gate B Dock",
    "items": [
      {
        "poItemId": 501,
        "shipmentScheduleId": 1001,
        "dispatchQty": 200.0000,
        "lotBatchNo": "BATCH-2026-L1",
        "packageCrateNo": "CRATE-01..10"
      }
    ]
  }
  ```
- **Logic สำหรับ Backend (Atomic Transaction):**
  1. สร้างเลขที่เอกสาร ASN อัตโนมัติ (เช่น `ASN-2026-0012`)
  2. สร้างรหัส Barcode Token (`BARCODE_TOKEN`)
  3. บันทึกข้อมูลลงตาราง `ADVANCE_SHIPPING_NOTICES` และ `ASN_ITEMS`
  4. อัปเดตตาราง `PO_ITEMS`:
     - เพิ่มยอดสะสม `SHIPPED_QTY = SHIPPED_QTY + dispatchQty`
     - คำนวณยอดคงเหลือ `REMAINING_QTY = ORDERED_QTY - SHIPPED_QTY`
  5. หาก `REMAINING_QTY == 0` ทุก Line ใน PO ให้อัปเดตสถานะ PO เป็น `SHIPPED` (ถ้ายังเหลือ ให้เป็น `PARTIAL_SHIPPED`)
  6. บันทึก `PO_AUDIT_LOGS` (`ACTION_CODE = 'ASN_GENERATED'`)
- **Response Success (201 Created):**
  ```json
  {
    "asnNo": "ASN-2026-0012",
    "barcodeToken": "AMEC-ASN-20260012-718890",
    "status": "CREATED",
    "createdAt": "2026-11-17T23:15:00+07:00"
  }
  ```

#### 11. `GET /orders/asns/:asnNo`
- **คำอธิบาย:** ดูรายละเอียดใบ ASN, ข้อมูลคนขับ, ทะเบียนรถ, รายการสินค้า และเอกสาร CoA แนบ

#### 12. `GET /orders/asns/:asnNo/delivery-slip`
- **คำอธิบาย:** ดาวน์โหลดใบนำส่งสินค้าและใบปะหน้าบาร์โค้ด (PDF) สำหรับติดหน้ารถบรรทุก

#### 13. `PATCH /orders/asns/:asnNo/dock-receive`
- **คำอธิบาย:** สำหรับเจ้าหน้าที่ AMEC Gate Dock สแกนบาร์โค้ดรับสินค้าเข้าคลัง และบันทึกผลตรวจรับ QA
- **Request Body (JSON):**
  ```json
  {
    "actualArrivalTime": "2026-12-05T13:45:00+07:00",
    "items": [
      {
        "poItemId": 501,
        "receivedQty": 200.0000,
        "rejectedQty": 0.0000,
        "qaStatus": "PASSED"
      }
    ]
  }
  ```

---

### หมวด 5: Audit Trail & Compliance Logging

#### 14. `GET /orders/:id/audit-logs`
- **คำอธิบาย:** ดึงประวัติกิจกรรมทั้งหมดเรียงตามลำดับเวลา (Timestamp Descending)
- **Response Success (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 901,
        "timestamp": "2026-11-17T16:02:18+07:00",
        "workflowEvent": "First Read / Opened by Supplier",
        "actorName": "Ms. Supaporn V.",
        "actorOrg": "Siam Precision Parts Co., Ltd.",
        "ipAddress": "183.88.240.12",
        "sessionId": "#SESS-89210",
        "details": "Opened PO document via extranet web session",
        "status": "Read"
      }
    ]
  }
  ```

#### 15. `GET /orders/:id/audit-logs/export`
- **คำอธิบาย:** Export รายการ Audit Trail ออกมาเป็นไฟล์ `Audit_PO_{id}.csv`

---

### หมวด 6: Export & Integration Services

#### 16. `GET /orders/:id/export/pdf`
- **คำอธิบาย:** ดาวน์โหลดใบสั่งซื้อฉบับทางการเป็นไฟล์ PDF พร้อมตรายางรับรองอิเล็กทรอนิกส์

#### 17. `GET /orders/:id/export/edi`
- **คำอธิบาย:** ส่งออกข้อมูลโครงสร้าง EDI (XML / JSON EDIFACT 850)

---

## 4. กฎเหล็กทางเทคนิคที่ Backend ต้องปฏิบัติตาม (Critical Rules)

1. **Database Transactions (ACID):**
   - การสร้าง ASN (`POST /orders/asns`) และการตรวจรับ (`PATCH /orders/asns/:asnNo/dock-receive`) **ต้องครอบด้วย DB Transaction เสมอ** หากการตัดยอดคงเหลือใน `PO_ITEMS` หรือบันทึก `ASN_ITEMS` ล้มเหลว ต้อง Rollback ทันที
2. **Audit Trail Immutability (ห้ามแก้ไขประวัติย้อนหลัง):**
   - ตาราง `PO_AUDIT_LOGS` ต้องเป็นแบบ **Insert-Only** ห้ามมีคำสั่ง `UPDATE` หรือ `DELETE` โดยเด็ดขาด
3. **การดึง IP Address ที่แท้จริง:**
   - ใน NestJS ต้องดึง IP ผ่าน `req.headers['x-forwarded-for'] || req.socket.remoteAddress` เพื่อบันทึก IP ต้นทางจริงของ Supplier
4. **ความแม่นยำของทศนิยม (Decimal Precision):**
   - ค่าจำนวน (`orderedQty`, `scheduledQty`, `dispatchQty`) และราคา (`unitPrice`) ต้องคำนวณด้วยความละเอียดทศนิยม 4 ตำแหน่ง (`DECIMAL(18, 4)`)
