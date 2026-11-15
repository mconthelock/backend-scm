import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module.js';

describe('Vendors E2E Test (Real Database)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtToken: string;
    let createdVendorId: number;

    const uniqueCodeNum = `8${Date.now().toString().slice(-4)}`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
            }),
        );
        await app.init();

        dataSource = moduleFixture.get<DataSource>(
            getDataSourceToken('dbConnection'),
        );

        // 1. จำลองการ Login ด้วย user 'admin' ที่มีอยู่ใน DB เพื่อรับ JWT Bearer Token
        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                username: 'admin',
                password: 'Password123!',
            })
            .expect(200);

        jwtToken = loginResponse.body.access_token;
        expect(jwtToken).toBeDefined();
    });

    afterAll(async () => {
        // ทำความสะอาดข้อมูลหลังจบการทดสอบ หากมีการสร้าง Vendor ไว้
        if (createdVendorId && dataSource?.isInitialized) {
            await dataSource.query('DELETE FROM VENDORS WHERE VND_ID = ?', [
                createdVendorId,
            ]);
        }
        if (app) {
            await app.close();
        }
    });

    it('POST /vendors - ควรบันทึก Vendor ใหม่พร้อม Codes และ Address ลงฐานข้อมูลจริงได้สำเร็จ', async () => {
        const newVendorPayload = {
            VND_NAME: 'E2E Test Vendor',
            VND_LONGNAME: 'E2E Test Vendor Corporation Co., Ltd.',
            VND_TYPE: 'SUPPLIER',
            VND_STATUS: 1,
            codes: [
                {
                    CODE_NUM: uniqueCodeNum,
                    CODE_STATUS: 1,
                },
            ],
            addresses: [
                {
                    ADDR_LINE1: '99/99 Bangna-Trad Road',
                    ADDR_CITY: 'Bangkok',
                    ADDR_COUNTRY: 764,
                    ADDR_ZIPCODE: '10260',
                    ADDR_STATUS: 1,
                },
            ],
        };

        const res = await request(app.getHttpServer())
            .post('/vendors')
            .set('Authorization', `Bearer ${jwtToken}`)
            .send(newVendorPayload)
            .expect(201);

        expect(res.body).toHaveProperty('VND_ID');
        expect(res.body.VND_NAME).toBe(newVendorPayload.VND_NAME);
        expect(res.body.VND_USERUPDATE).toBe('admin');
        expect(res.body.codes).toHaveLength(1);
        expect(res.body.codes[0].CODE_NUM).toBe(uniqueCodeNum);
        expect(res.body.addresses).toHaveLength(1);
        expect(res.body.addresses[0].ADDR_CITY).toBe('Bangkok');

        createdVendorId = res.body.VND_ID;

        // 2. Query เช็กจาก Database ตรงๆ เพื่อยืนยันว่าข้อมูลถูกบันทึกจริง
        const savedVendorRows = await dataSource.query(
            'SELECT VND_ID, VND_NAME, VND_LONGNAME, VND_STATUS, VND_USERUPDATE FROM VENDORS WHERE VND_ID = ?',
            [createdVendorId],
        );
        expect(savedVendorRows).toHaveLength(1);
        expect(savedVendorRows[0].VND_NAME).toBe('E2E Test Vendor');
        expect(savedVendorRows[0].VND_USERUPDATE).toBe('admin');

        const savedCodeRows = await dataSource.query(
            'SELECT CODE_ID, CODE_NUM, VENDOR_ID FROM VENDORS_CODE WHERE VENDOR_ID = ?',
            [createdVendorId],
        );
        expect(savedCodeRows).toHaveLength(1);
        expect(savedCodeRows[0].CODE_NUM).toBe(uniqueCodeNum);

        const savedAddressRows = await dataSource.query(
            'SELECT ADDR_ID, ADDR_CITY, VENDOR_ID FROM VENDORS_ADDRESS WHERE VENDOR_ID = ?',
            [createdVendorId],
        );
        expect(savedAddressRows).toHaveLength(1);
        expect(savedAddressRows[0].ADDR_CITY).toBe('Bangkok');
    });

    it('GET /vendors/:id - ควรดึงข้อมูล Vendor ที่เพิ่งสร้างจาก DB ได้ถูกต้อง', async () => {
        const res = await request(app.getHttpServer())
            .get(`/vendors/${createdVendorId}`)
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200);

        expect(res.body.VND_ID).toBe(createdVendorId);
        expect(res.body.VND_NAME).toBe('E2E Test Vendor');
        expect(res.body.codes[0].CODE_NUM).toBe(uniqueCodeNum);
    });
});
