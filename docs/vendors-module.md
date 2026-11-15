# โมดูลคู่ค้า (Vendors Module)

เอกสารสรุปสถาปัตยกรรมและการทำงานของระบบ CRUD ข้อมูลบริษัทคู่ค้า / ผู้ผลิต (Vendors) ตามโครงสร้างฐานข้อมูลอัปเดตใหม่ใน [docs/vendors.md](file:///Users/onthelock/my/php/src/backend-scm/docs/vendors.md)

---

## 1. โครงสร้าง Entity & ความสัมพันธ์ (Relations)

1. **`Vendors` (ตาราง `VENDORS`)**:
   - `VND_CODE`: รหัสคู่ค้า **VARCHAR(6)** (Primary Key อ้างอิงคู่ค้า)
   - `VND_NAME`: ชื่อย่อ หรือชื่อทางการค้า (Required)
   - `VND_LONGNAME`: ชื่อเต็มบริษัท (Legal Name)
   - `VND_TYPE`: ประเภทคู่ค้า
   - `VND_STATUS`: สถานะ (`1=Active`, `2=Inactive`, `4=Pending Approval`)
   - `VND_REGDATE`: วันที่ลงทะเบียนคู่ค้า
   - `VND_LASTUPDATE`: วันที่แก้ไขล่าสุด (Auto Update)
   - `VND_USERUPDATE`: ชื่อผู้ใช้งานที่บันทึก/อัปเดต (ดึงจาก `@CurrentUser()` อัตโนมัติ)
   - **Relations**:
     - `@OneToMany` -> `VendorsAddress` (1 Vendor มีได้หลายที่อยู่)

2. **`VendorsAddress` (ตาราง `VENDORS_ADDRESS`)**:
   - `ADDR_ID`: Primary Key (Auto Increment)
   - `VENDOR_ID`: Foreign Key **VARCHAR(5)** อ้างอิง `VENDORS.VND_CODE` (CASCADE on delete/update)
   - `ADDR_LINE1`, `ADDR_LINE2`, `ADDR_LINE3`, `ADDR_CITY`, `ADDR_COUNTRY`, `ADDR_ZIPCODE`
   - `ADDR_STATUS`: สถานะที่อยู่ (`1=Active`)

3. **`VendorsGroup` (ตาราง `VENDORS_GROUP`)**:
   - `CODE_ID`: Primary Key (Auto Increment)
   - `CODE_NUM`: รหัส Vendor Code (Unique)
   - `VENDOR_GROUP`: INT
   - `CODE_STATUS`: สถานะ (`1=Active`, `0=Inactive`)
   - `CODE_REGDATE`: วันที่ลงทะเบียน

---

## 2. Transaction Architecture & Repository Pattern

- **Decorators**: `@UseTransaction('dbConnection')` และ `@UseForceTransaction()` ที่ระดับ Controller
- **Interceptor**: `TransactionInterceptor` ทำหน้าที่เปิด Transaction (`queryRunner`) และจัดการ Commit / Rollback อัตโนมัติผ่าน `transactionContext` (AsyncLocalStorage)
- **Repository**: `VendorsRepository extends BaseRepository` จัดการบันทึกข้อมูลผ่าน Transaction Context เสมอ

---

## 3. รายการ API Endpoints (`/vendors`)

> **หมายเหตุ**: ทุก Endpoint ถูกคุ้มครองด้วย `JwtAuthGuard` อัตโนมัติ (ต้องแนบ `Authorization: Bearer <token>`)

### 3.1 ดึงรายการคู่ค้า (List & Search & Pagination)
- **Method**: `GET /vendors`
- **Query Parameters**:
  - `page`: หน้าที่ต้องการ (Default: `1`)
  - `limit`: จำนวนรายการต่อหน้า (Default: `20`, Max: `100`)
  - `search`: ค้นหาจาก `VND_CODE`, `VND_NAME`, `VND_LONGNAME`
  - `status`: กรองตามสถานะ (`1`, `2`, `4`)
  - `type`: กรองตามประเภทคู่ค้า
- **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "VND_CODE": "V0001",
        "VND_NAME": "ABC Co., Ltd.",
        "VND_LONGNAME": "ABC International Company Limited",
        "VND_TYPE": "MANUFACTURER",
        "VND_STATUS": 1,
        "VND_REGDATE": "2026-11-15T11:00:00.000Z",
        "VND_LASTUPDATE": "2026-11-15T11:00:00.000Z",
        "VND_USERUPDATE": "admin",
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

### 3.2 ดึงข้อมูลคู่ค้ารายตัว (Get by Code)
- **Method**: `GET /vendors/:code`
- **Response (200 OK)**: ข้อมูลคู่ค้าพร้อมรายการ `addresses`

---

### 3.3 สร้างคู่ค้าใหม่ (Create Vendor)
- **Method**: `POST /vendors`
- **Body**:
  ```json
  {
    "VND_CODE": "V0002",
    "VND_NAME": "XYZ Tech",
    "VND_LONGNAME": "XYZ Technology Co., Ltd.",
    "VND_TYPE": "SUPPLIER",
    "VND_STATUS": 1,
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
  - ตรวจสอบความซ้ำซ้อนของ `VND_CODE`
  - บันทึกลงใน Database ภายใต้ Transaction ผ่าน `VendorsRepository`
  - บันทึกผู้สร้างใน `VND_USERUPDATE` จาก Token อัตโนมัติ

---

### 3.4 แก้ไขข้อมูลคู่ค้า (Update Vendor)
- **Method**: `PATCH /vendors/:code`
- **Body**: สามารถเลือกส่งเฉพาะฟิลด์ที่ต้องการอัปเดตได้ (รวมถึงแทนที่ `addresses`)

---

### 3.5 ลบข้อมูลคู่ค้า (Delete Vendor)
- **Method**: `DELETE /vendors/:code`
- **การทำงาน**: ลบข้อมูลคู่ค้า โดย `VENDORS_ADDRESS` จะถูกลบตามแบบ Cascade อัตโนมัติ
