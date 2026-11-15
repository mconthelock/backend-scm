import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VendorsService } from '../../../src/vendors/vendors.service.js';
import { Vendors } from '../../../src/entities/table/vendors.entity.js';
import { VendorsCode } from '../../../src/entities/table/vendors-code.entity.js';
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
        getOne: vi.fn(),
    };

    const mockVendorsRepository = {
        createQueryBuilder: vi.fn(() => mockQueryBuilder),
        findOne: vi.fn(),
        delete: vi.fn(),
    };

    const mockVendorsCodeRepository = {
        createQueryBuilder: vi.fn(() => mockQueryBuilder),
    };

    const mockVendorsAddressRepository = {};

    const mockQueryRunner = {
        connect: vi.fn(),
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        rollbackTransaction: vi.fn(),
        release: vi.fn(),
        manager: {
            create: vi.fn((_entity, data) => data),
            save: vi.fn(async (_entity, data) => {
                if (Array.isArray(data)) return data;
                return { ...data, VND_ID: 1 };
            }),
            delete: vi.fn(),
        },
    };

    const mockDataSource = {
        createQueryRunner: vi.fn(() => mockQueryRunner),
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
                    provide: getRepositoryToken(VendorsCode, 'dbConnection'),
                    useValue: mockVendorsCodeRepository,
                },
                {
                    provide: getRepositoryToken(VendorsAddress, 'dbConnection'),
                    useValue: mockVendorsAddressRepository,
                },
                {
                    provide: getDataSourceToken('dbConnection'),
                    useValue: mockDataSource,
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
            const mockList = [{ VND_ID: 1, VND_NAME: 'Vendor A' }];
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockList, 1]);

            const res = await service.findAll({ page: 1, limit: 10, search: 'A' });
            expect(res.items).toEqual(mockList);
            expect(res.meta.total).toBe(1);
            expect(res.meta.totalPages).toBe(1);
        });
    });

    describe('findOne', () => {
        it('should return vendor by ID', async () => {
            const vendor = { VND_ID: 1, VND_NAME: 'Vendor A' };
            mockVendorsRepository.findOne.mockResolvedValue(vendor);

            const res = await service.findOne(1);
            expect(res).toEqual(vendor);
        });

        it('should throw NotFoundException if vendor not found', async () => {
            mockVendorsRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('create', () => {
        it('should throw ConflictException if duplicate CODE_NUM exists', async () => {
            mockQueryBuilder.getOne.mockResolvedValue({ CODE_NUM: '80001' });

            await expect(
                service.create({
                    VND_NAME: 'Test Vendor',
                    codes: [{ CODE_NUM: '80001' }],
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('should create vendor with codes and addresses in transaction', async () => {
            mockQueryBuilder.getOne.mockResolvedValue(null);
            const savedResult = {
                VND_ID: 1,
                VND_NAME: 'Test Vendor',
                codes: [{ CODE_NUM: '80001' }],
                addresses: [],
            };
            mockVendorsRepository.findOne.mockResolvedValue(savedResult);

            const res = await service.create(
                {
                    VND_NAME: 'Test Vendor',
                    codes: [{ CODE_NUM: '80001' }],
                },
                'admin',
            );

            expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
            expect(res).toEqual(savedResult);
        });
    });

    describe('remove', () => {
        it('should delete vendor if exists', async () => {
            mockVendorsRepository.findOne.mockResolvedValue({ VND_ID: 1 });
            mockVendorsRepository.delete.mockResolvedValue({ affected: 1 });

            const res = await service.remove(1);
            expect(res.message).toContain('ลบข้อมูลคู่ค้า ID #1 สำเร็จ');
        });
    });
});
