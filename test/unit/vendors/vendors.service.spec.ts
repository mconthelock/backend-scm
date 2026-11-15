import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VendorsService } from '../../../src/vendors/vendors.service.js';
import { VendorsRepository } from '../../../src/vendors/vendors.repository.js';
import { Vendors } from '../../../src/entities/table/vendors.entity.js';
import { VendorsAddress } from '../../../src/entities/table/vendors-address.entity.js';

describe('VendorsService', () => {
    let service: VendorsService;

    const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn(),
    };

    const mockVendorsRepository = {
        createQueryBuilder: vi.fn(() => mockQueryBuilder),
        findOne: vi.fn(),
        delete: vi.fn(),
    };

    const mockVendorsAddressRepository = {};

    const mockVndRepo = {
        findVendorByCode: vi.fn(),
        createVendor: vi.fn(async (data) => data),
        createAddress: vi.fn(async (data) => data),
        createAddresses: vi.fn(async (data) => data),
        deleteAddressesByVendor: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VendorsService,
                {
                    provide: getRepositoryToken(Vendors, 'dbConnection'),
                    useValue: mockVendorsRepository,
                },
                {
                    provide: getRepositoryToken(VendorsAddress, 'dbConnection'),
                    useValue: mockVendorsAddressRepository,
                },
                {
                    provide: VendorsRepository,
                    useValue: mockVndRepo,
                },
            ],
        }).compile();

        service = module.get<VendorsService>(VendorsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated vendors', async () => {
            const mockList = [{ VND_CODE: 'V0001', VND_NAME: 'Vendor A' }];
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockList, 1]);

            const res = await service.findAll({ page: 1, limit: 10, search: 'A' });
            expect(res.items).toEqual(mockList);
            expect(res.meta.total).toBe(1);
            expect(res.meta.totalPages).toBe(1);
        });
    });

    describe('findOne', () => {
        it('should return vendor by VND_CODE', async () => {
            const vendor = { VND_CODE: 'V0001', VND_NAME: 'Vendor A' };
            mockVndRepo.findVendorByCode.mockResolvedValue(vendor);

            const res = await service.findOne('V0001');
            expect(res).toEqual(vendor);
        });

        it('should throw NotFoundException if vendor not found', async () => {
            mockVndRepo.findVendorByCode.mockResolvedValue(null);

            await expect(service.findOne('V9999')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('create', () => {
        it('should throw ConflictException if duplicate VND_CODE exists', async () => {
            mockVendorsRepository.findOne.mockResolvedValue({ VND_CODE: 'V0001' });

            await expect(
                service.create({
                    VND_CODE: 'V0001',
                    VND_NAME: 'Test Vendor',
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('should create vendor with addresses successfully', async () => {
            mockVendorsRepository.findOne.mockResolvedValue(null); // check exists
            mockVndRepo.findVendorByCode.mockResolvedValue({
                VND_CODE: 'V0001',
                VND_NAME: 'Test Vendor',
                addresses: [],
            }); // findOne after creation

            const res = await service.create(
                {
                    VND_CODE: 'V0001',
                    VND_NAME: 'Test Vendor',
                    addresses: [
                        {
                            ADDR_CITY: 'Bangkok',
                        },
                    ],
                },
                'admin',
            );

            expect(mockVndRepo.createVendor).toHaveBeenCalled();
            expect(mockVndRepo.createAddresses).toHaveBeenCalled();
            expect(res.VND_CODE).toBe('V0001');
        });
    });

    describe('remove', () => {
        it('should delete vendor if exists', async () => {
            mockVndRepo.findVendorByCode.mockResolvedValue({ VND_CODE: 'V0001' });
            mockVendorsRepository.delete.mockResolvedValue({ affected: 1 });

            const res = await service.remove('V0001');
            expect(res.message).toContain("ลบข้อมูลคู่ค้า รหัส 'V0001' สำเร็จ");
        });
    });
});
