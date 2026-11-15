# ระบบ Authentication (Auth Module)

เอกสารสรุปสถาปัตยกรรมและการทำงานของระบบ Authentication สำหรับระบบ Backend SCM พัฒนาด้วย NestJS ร่วมกับ Passport (`passport-local`, `passport-jwt`), `@nestjs/jwt` และ TypeORM เชื่อมโยงกับฐานข้อมูล `USERS` และ `USERS_PASSWORD`

---

## 1. สถาปัตยกรรมและเทคโนโลยีที่ใช้

- **Framework**: NestJS (ESM Module `"type": "module"`)
- **Authentication Strategy & Guard**:
  - `passport-local`: ตรวจสอบผู้ใช้งานด้วย Username/Password
  - `passport-jwt`: ตรวจสอบความถูกต้องและสิทธิ์การเข้าถึงผ่าน Bearer JWT Token
  - **Global Guard (`APP_GUARD`)**: เปิดใช้งาน `JwtAuthGuard` เป็น Global Guard ใน [AppModule](file:///Users/onthelock/my/php/src/backend-scm/src/app.module.ts) ทำให้ **ทุก Route / Controller ถูกกั้น (Require Login) เป็นค่าเริ่มต้นทันที**
  - **Public Decorator (`@Public()`)**: ใช้ระบุ Route ที่ต้องการยกเว้นให้เข้าถึงได้โดยไม่ต้อง Login เช่น `/auth/login` เท่านั้น (สำหรับ `/auth/register` ถูกล็อกให้ต้องล็อกอินก่อน จึงจะสร้างผู้ใช้ได้)
- **Database ORM**: TypeORM
  - ตาราง `USERS`: ข้อมูลผู้ใช้งานหลัก
  - ตาราง `USERS_PASSWORD`: ข้อมูลรหัสผ่านปัจจุบันและรหัสผ่านก่อนหน้า
- **Password Hashing**: Node.js `node:crypto` (`createHash`, `timingSafeEqual`)
  - รองรับ Auto-detection ตามความยาว Hash ของข้อมูลเดิม:
    - **MD5**: 32 ตัวอักษร (Hex) สำหรับข้อมูลระบบเดิม (Legacy)
    - **SHA-256**: 64 ตัวอักษร (Hex) เป็นค่าเริ่มต้นปัจจุบัน
    - **SHA-512**: 128 ตัวอักษร (Hex)
- **Token Format**: JSON Web Token (JWT) ส่งผ่าน Header `Authorization: Bearer <token>`

---

## 2. ตัวแปร Environment Variables (`.env`)

```env
# พอร์ตและฐานข้อมูล
PORT=3002
HOST="HOME"
DB_HOST="localhost"
DB_PORT="33061"
DB_USER="amec"
DB_PASSWORD="P@ssw0rd"
DB_DATABASE="AMECSCM"

# การตั้งค่า JWT และการเข้ารหัส
JWT_SECRET="amec-scm-jwt-secret-key"
JWT_EXPIRES_IN="1d"
PASSWORD_HASH_ALGO="sha256" # md5, sha256 หรือ sha512
```

---

## 3. โครงสร้างตารางฐานข้อมูล

### 3.1 ตาราง `USERS`
- `USR_ID` (PK, int): รหัสประจำตัวผู้ใช้งาน
- `USR_LOGIN` (varchar, unique): ชื่อผู้ใช้งาน (Username)
- `USR_NAME` (varchar): ชื่อ-นามสกุล
- `USR_EMAIL` (varchar): อีเมล
- `USR_STATUS` (tinyint): สถานะผู้ใช้งาน (`1` = ใช้งานปกติ, ค่าอื่น = ถูกระงับสิทธิ์)
- `GROUPS` (int): สิทธิ์กลุ่มผู้ใช้งาน (Default: 16)
- `VENDORS` (int, nullable): รหัส Vendor (ถ้ามี)
- `PROD_ID` (varchar, nullable): รหัสสินค้า/ฝ่ายที่เกี่ยวข้อง
- `USR_REGISTDATE` (datetime): วันที่ลงทะเบียน
- `USR_LASTLOGIN` (datetime): วันและเวลาที่เข้าสู่ระบบล่าสุด (อัปเดตอัตโนมัติเมื่อ Login)
- `USR_RESETDATE` (datetime): วันและเวลาที่มีการเปลี่ยนรหัสผ่านล่าสุด
- `USR_LASTUPDATE` (datetime): วันและเวลาที่มีการอัปเดตข้อมูลล่าสุด

### 3.2 ตาราง `USERS_PASSWORD`
- `USERS` (PK / FK -> USERS.USR_ID, int): เชื่อมโยงกับผู้ใช้งาน
- `PWD_CURRENT` (varchar 128): รหัสผ่านปัจจุบัน (Hash)
- `PWD_PREVIOUS` (varchar 128, nullable): รหัสผ่านก่อนหน้า (Hash)
- `PWD_UPDATEDATE` (datetime): วันเวลาที่อัปเดตรหัสผ่านล่าสุด

---

## 4. รายการ API Endpoints

### 4.1 เข้าสู่ระบบ (Login)
- **Endpoint**: `POST /auth/login`
- **Auth Guard**: `LocalAuthGuard` (`passport-local`)
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "Password123"
  }
  ```
  *(รองรับ Key `USR_LOGIN` และ `PWD_CURRENT` แทนได้)*
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": "1d",
    "user": {
      "USR_ID": 1,
      "USR_LOGIN": "admin",
      "USR_NAME": "Administrator",
      "USR_EMAIL": "admin@example.com",
      "USR_STATUS": 1,
      "GROUPS": 16,
      "VENDORS": null,
      "PROD_ID": null,
      "USR_PIC": null,
      "USR_PIC_EMAIL": null,
      "USR_PDPA": 0,
      "USR_REGISTDATE": "2026-11-15T10:00:00.000Z",
      "USR_RESETDATE": null,
      "USR_LASTLOGIN": "2026-11-15T10:15:30.000Z",
      "USR_LASTUPDATE": "2026-11-15T10:00:00.000Z"
    }
  }
  ```

---

### 4.2 ลงทะเบียนผู้ใช้ใหม่ (Register)
- **Endpoint**: `POST /auth/register`
- **Auth Guard**: `JwtAuthGuard` (บังคับต้อง Login ผ่านระบบภายในก่อนเท่านั้น)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <access_token>`
- **Body**:
  ```json
  {
    "USR_LOGIN": "vendor_user",
    "password": "Password123",
    "USR_NAME": "Vendor Test",
    "USR_EMAIL": "vendor@example.com",
    "GROUPS": 16,
    "VENDORS": 1001,
    "PROD_ID": "PROD-01"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "สร้างบัญชีผู้ใช้งานสำเร็จ",
    "user": { ... }
  }
  ```

---

### 4.3 ดูข้อมูลส่วนตัว (Get Profile)
- **Endpoint**: `GET /auth/profile`
- **Auth Guard**: `JwtAuthGuard`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (200 OK)**: ข้อมูล User ในระบบที่ไม่มีฟิลด์รหัสผ่าน

---

### 4.4 เปลี่ยนรหัสผ่าน (Change Password)
- **Endpoint**: `PATCH /auth/change-password` หรือ `POST /auth/change-password`
- **Auth Guard**: `JwtAuthGuard` (ต้องล็อกอินก่อน)
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**:
  ```json
  {
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword456"
  }
  ```
- **เงื่อนไข**:
  - ตรวจสอบ `currentPassword` ต้องถูกต้อง
  - รหัสผ่านใหม่ต้องไม่ตรงกับรหัสผ่านเดิม
  - ระบบจะย้ายค่าใน `PWD_CURRENT` ไปไว้ที่ `PWD_PREVIOUS` ก่อนบันทึก Hash ใหม่ลง `PWD_CURRENT`
- **Response (200 OK)**:
  ```json
  {
    "message": "เปลี่ยนรหัสผ่านสำเร็จ"
  }
  ```

---

### 4.5 ลืมรหัสผ่าน (Forgot Password)
- **Endpoint**: `POST /auth/forgot-password`
- **Auth Guard**: `@Public()` (ไม่ต้องล็อกอิน)
- **Body**:
  ```json
  {
    "identifier": "admin" // หรือ "admin@example.com"
  }
  ```
- **การทำงาน**:
  - สร้าง Token สำหรับรีเซ็ตรหัสผ่านที่มีอายุสั้น (Default: `15m` จาก `RESET_PASSWORD_EXPIRES_IN`)
  - คืนค่า Message ที่ปลอดภัย (ป้องกัน User enumeration) พร้อม `reset_token` สำหรับนำไปส่ง Email หรือใช้ตั้งรหัสผ่านใหม่
- **Response (200 OK)**:
  ```json
  {
    "message": "หากข้อมูลผู้ใช้งานถูกต้อง ระบบได้ดำเนินการส่งคำแนะนำการรีเซ็ตรหัสผ่านแล้ว",
    "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### 4.6 ตั้งรหัสผ่านใหม่ด้วย Reset Token (Reset Password)
- **Endpoint**: `POST /auth/reset-password`
- **Auth Guard**: `@Public()` (ไม่ต้องล็อกอิน)
- **Body**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "newPassword": "NewPassword123"
  }
  ```
- **การทำงาน**:
  - ตรวจสอบความถูกต้องและอายุของ `token` (ประเภทต้องเป็น `reset_password`)
  - รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิมใน `PWD_CURRENT`
  - ย้ายรหัสเดิมไป `PWD_PREVIOUS` และอัปเดต `PWD_CURRENT`, `PWD_UPDATEDATE`, `USR_RESETDATE`
  - ทำการเพิกถอน Token ทันที (One-time use) ไม่สามารถนำกลับมาใช้ซ้ำได้
- **Response (200 OK)**:
  ```json
  {
    "message": "ตั้งรหัสผ่านใหม่สำเร็จ สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที"
  }
  ```

---

### 4.7 ออกจากระบบ (Logout)
- **Endpoint**: `POST /auth/logout`
- **Auth Guard**: `JwtAuthGuard`
- **Headers**: `Authorization: Bearer <access_token>`
- **การทำงาน**: บันทึก Token ปัจจุบันเข้า Blocklist / Revoke list จนกว่า Token จะหมดอายุ (TTL) เพื่อป้องกันการนำ Token เดิมมาเรียกซ้ำ
- **Response (200 OK)**:
  ```json
  {
    "message": "ออกจากระบบสำเร็จ"
  }
  ```

---

## 5. แผนผังโฟลเดอร์และไฟล์ที่เกี่ยวข้อง

```text
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # ดึง User ปัจจุบันจาก Request
│   │   └── public.decorator.ts         # กำหนด Public Endpoint
│   ├── dto/
│   │   ├── change-password.dto.ts      # DTO เปลี่ยนรหัสผ่าน
│   │   ├── forgot-password.dto.ts      # DTO ขอรีเซ็ตรหัสผ่าน
│   │   ├── reset-password.dto.ts       # DTO ตั้งรหัสผ่านใหม่
│   │   ├── login.dto.ts                # DTO เข้าสู่ระบบ
│   │   └── register.dto.ts             # DTO ลงทะเบียนผู้ใช้
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # Guard ตรวจสอบ JWT Token
│   │   └── local-auth.guard.ts         # Guard ตรวจสอบ Login ด้วย Passport Local
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts    # Interface ของ Payload ใน JWT
│   ├── strategies/
│   │   ├── jwt.strategy.ts             # Passport JWT Strategy
│   │   └── local.strategy.ts           # Passport Local Strategy
│   ├── auth.controller.ts              # API Controller
│   ├── auth.service.ts                 # Business Logic, Hashing, Validation
│   └── auth.module.ts                  # NestJS Module
└── entities/table/
    ├── users.entity.ts                 # Entity ตาราง USERS
    └── users-password.entity.ts        # Entity ตาราง USERS_PASSWORD

test/
├── unit/
│   └── auth/
│       ├── auth.controller.spec.ts     # Unit Test Controller
│       └── auth.service.spec.ts        # Unit Test Service
└── app.e2e-spec.ts                     # E2E Test
```

---

## 6. การทดสอบ (Testing & Linting)

สามารถรันคำสั่งเพื่อทดสอบความถูกต้องของระบบ Authentication ได้ดังนี้:

```bash
# รัน Unit Tests ทั้งหมด
npm test

# รัน Linting
npm run lint

# รัน Build
npm run build
```
