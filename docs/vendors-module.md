# โมดูลคู่ค้า (Vendors Module)

เอกสารสรุปสถาปัตยกรรมและการทำงานของระบบ CRUD ข้อมูลบริษัทคู่ค้า / ผู้ผลิต (Vendors) ตามโครงสร้างฐานข้อมูลใน [docs/vendors.md](file:///Users/onthelock/my/php/src/backend-scm/docs/vendors.md)

---

## 1. โครงสร้าง Entity & ความสัมพันธ์ (Relations)

1. **`Vendors` (ตาราง `VENDORS`)**:
   - `VND_ID`: รหัสคู่ค้า (Primary Key, Auto Increment)
   - `VND_NAME`: ชื่อย่อ หรือชื่อทางการค้า (Required)
   - `VND_LONGNAME`: ชื่อเต็มบริษัท (Legal Name)
   - `VND_TYPE`: ประเภทคู่ค้า
   - `VND_STATUS`: สถานะ (`1=Active`, `2=Inactive`, `4=Pending Approval`)
   - `VND_REGDATE`: วันที่ลงทะเบียน
   - `VND_LASTUPDATE`: วันที่แก้ไขล่าสุด (Auto Update)
   - `VND_USERUPDATE`: ชื่อผู้ใช้งานที่บันทึก/อัปเดต (ดึงจาก `@CurrentUser()` อัตโนมัติ)
   - **Relations**:
     - `@OneToMany` -> `VendorsCode` (1 Vendor มีได้หลาย Code)
     - `@OneToMany` -> `VendorsAddress` (1 Vendor มีได้หลายที่อยู่)
     - `@OneToMany` -> `Users` (เชื่อมโยงผู้ใช้ในตาราง USERS ผ่าน FK `VENDORS`)

2. **`VendorsCode` (ตาราง `VENDORS_CODE`)**:
   - `CODE_ID`: Primary Key
   - `CODE_NUM`: รหัสคู่ค้า (Unique Key เช่น 80001, 80002)
   - `VENDOR_ID`: Foreign Key อ้างอิง `VENDORS.VND_ID` (CASCADE on delete/update)
   - `CODE_STATUS`: สถานะ (`1=Active`, `0=Inactive`)
   - `CODE_REGDATE`: วันที่ลงทะเบียนรหัส

3. **`VendorsAddress` (ตาราง `VENDORS_ADDRESS`)**:
   - `ADDR_ID`: Primary Key
   - `VENDOR_ID`: Foreign Key อ้างอิง `VENDORS.VND_ID` (CASCADE on delete/update)
   - `ADDR_LINE1`, `ADDR_LINE2`, `ADDR_LINE3`, `ADDR_CITY`, `ADDR_COUNTRY`, `ADDR_ZIPCODE`
   - `ADDR_STATUS`: สถานะที่อยู่ (`1=Active`)

---

## 2. รายการ API Endpoints (`/vendors`)

> **หมายเหตุ**: ทุก Endpoint ถูกคุ้มครองด้วย `JwtAuthGuard` อัตโนมัติ (ต้องแนบ `Authorization: Bearer <token>`)

### 2.1 ดึงรายการคู่ค้า (List & Search & Pagination)
- **Method**: `GET /vendors`
- **Query Parameters**:
  - `page`: หน้าที่ต้องการ (Default: `1`)
  - `limit`: จำนวนรายการต่อหน้า (Default: `20`, Max: `100`)
  - `search`: ค้นหาจาก `VND_NAME`, `VND_LONGNAME` หรือ `CODE_NUM`
  - `status`: กรองตามสถานะ (`1`, `2`, `4`)
  - `type`: กรองตามประเภทคู่ค้า
- **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "VND_ID": 1,
        "VND_NAME": "ABC Co., Ltd.",
        "VND_LONGNAME": "ABC International Company Limited",
        "VND_TYPE": "MANUFACTURER",
        "VND_STATUS": 1,
        "VND_REGDATE": "2026-11-15T11:00:00.000Z",
        "VND_LASTUPDATE": "2026-11-15T11:00:00.000Z",
        "VND_USERUPDATE": "admin",
        "codes": [
          { "CODE_ID": 1, "CODE_NUM": "80001", "CODE_STATUS": 1 }
        ],
        "addresses": [
          { "ADDR_ID": 1, "ADDR_LINE1": "123 Sukhumvit", "ADDR_CITY": "Bangkok", "ADDR_ZIPCODE": "10110" }
        ]
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

---

### 2.2 ดึงข้อมูลคู่ค้ารายตัว (Get by ID)
- **Method**: `GET /vendors/:id`
- **Response (200 OK)**: ข้อมูลคู่ค้าพร้อมรายการ `codes` และ `addresses` ทั้งหมด

---

### 2.3 สร้างคู่ค้าใหม่ (Create Vendor)
- **Method**: `POST /vendors`
- **Body**:
  ```json
  {
    "VND_NAME": "XYZ Tech",
    "VND_LONGNAME": "XYZ Technology Co., Ltd.",
    "VND_TYPE": "SUPPLIER",
    "VND_STATUS": 1,
    "codes": [
      { "CODE_NUM": "80002", "CODE_STATUS": 1 }
    ],
    "addresses": [
      {
        "ADDR_LINE1": "456 Bangna-Trad Rd.",
        "ADDR_CITY": "Samut Prakan",
        "ADDR_COUNTRY": 764,
        "ADDR_ZIPCODE": "10540",
        "ADDR_STATUS": 1
      }
    ]
  }
  ```
- **การทำงาน**:
  - ดำเนินการผ่าน Database Transaction (ACID)
  - ตรวจสอบความซ้ำซ้อนของ `CODE_NUM` ในระบบก่อนบันทึก
  - บันทึกผู้สร้างใน `VND_USERUPDATE` จาก Token อัตโนมัติ

---

### 2.4 แก้ไขข้อมูลคู่ค้า (Update Vendor)
- **Method**: `PATCH /vendors/:id`
- **Body**: สามารถเลือกส่งเฉพาะฟิลด์ที่ต้องการอัปเดตได้
- **การทำงาน**: อัปเดตข้อมูลคู่ค้า, จัดการ `codes` และ `addresses` ใน Transaction พร้อมอัปเดต `VND_LASTUPDATE` และ `VND_USERUPDATE`

---

### 2.5 ลบข้อมูลคู่ค้า (Delete Vendor)
- **Method**: `DELETE /vendors/:id`
- **การทำงาน**: ลบข้อมูลคู่ค้า โดย `VENDORS_CODE` และ `VENDORS_ADDRESS` จะถูกลบตามแบบ Cascade อัตโนมัติ
