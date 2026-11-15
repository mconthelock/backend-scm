import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vendors } from '../entities/table/vendors.entity.js';
import { VendorsCode } from '../entities/table/vendors-code.entity.js';
import { VendorsAddress } from '../entities/table/vendors-address.entity.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { QueryVendorDto } from './dto/query-vendor.dto.js';

@Injectable()
export class VendorsService {
    constructor(
        @InjectRepository(Vendors, 'dbConnection')
        private readonly vendorsRepository: Repository<Vendors>,
        @InjectRepository(VendorsCode, 'dbConnection')
        private readonly vendorsCodeRepository: Repository<VendorsCode>,
        @InjectRepository(VendorsAddress, 'dbConnection')
        private readonly vendorsAddressRepository: Repository<VendorsAddress>,
        @InjectDataSource('dbConnection')
        private readonly dataSource: DataSource,
    ) {}

    /**
     * ดึงรายการ Vendor ทั้งหมด พร้อม Pagination, Search และ Filter
     */
    async findAll(query: QueryVendorDto) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const skip = (page - 1) * limit;

        const qb = this.vendorsRepository
            .createQueryBuilder('vendor')
            .leftJoinAndSelect('vendor.codes', 'codes')
            .leftJoinAndSelect('vendor.addresses', 'addresses');

        if (query.search) {
            const searchKeyword = `%${query.search.trim()}%`;
            qb.andWhere(
                '(vendor.VND_NAME LIKE :search OR vendor.VND_LONGNAME LIKE :search OR codes.CODE_NUM LIKE :search)',
                { search: searchKeyword },
            );
        }

        if (query.status !== undefined) {
            qb.andWhere('vendor.VND_STATUS = :status', {
                status: query.status,
            });
        }

        if (query.type) {
            qb.andWhere('vendor.VND_TYPE = :type', { type: query.type });
        }

        qb.orderBy('vendor.VND_ID', 'DESC').skip(skip).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * ดึงข้อมูล Vendor ตาม ID พร้อม Relations (codes, addresses)
     */
    async findOne(id: number) {
        const vendor = await this.vendorsRepository.findOne({
            where: { VND_ID: id },
            relations: {
                codes: true,
                addresses: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException(`ไม่พบข้อมูลคู่ค้า ID #${id}`);
        }

        return vendor;
    }

    /**
     * สร้างคู่ค้าใหม่ พร้อมสร้างรหัส (codes) และที่อยู่ (addresses) ใน Transaction
     */
    async create(createVendorDto: CreateVendorDto, username?: string) {
        // ตรวจสอบความซ้ำซ้อนของ CODE_NUM หากมีการส่งมา
        if (createVendorDto.codes?.length) {
            const codeNums = createVendorDto.codes.map((c) => c.CODE_NUM.trim());
            const duplicateCheck = await this.vendorsCodeRepository
                .createQueryBuilder('code')
                .where('code.CODE_NUM IN (:...codeNums)', { codeNums })
                .getOne();

            if (duplicateCheck) {
                throw new ConflictException(
                    `รหัสคู่ค้า (CODE_NUM) '${duplicateCheck.CODE_NUM}' มีอยู่ในระบบแล้ว`,
                );
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const now = new Date();
            const vendorEntity = queryRunner.manager.create(Vendors, {
                VND_NAME: createVendorDto.VND_NAME.trim(),
                VND_LONGNAME: createVendorDto.VND_LONGNAME?.trim() ?? null,
                VND_TYPE: createVendorDto.VND_TYPE?.trim() ?? null,
                VND_STATUS: createVendorDto.VND_STATUS ?? 1,
                VND_USERUPDATE: username ?? null,
                VND_REGDATE: now,
                VND_LASTUPDATE: now,
            });

            const savedVendor = await queryRunner.manager.save(
                Vendors,
                vendorEntity,
            );

            if (createVendorDto.codes?.length) {
                const codeEntities = createVendorDto.codes.map((codeDto) =>
                    queryRunner.manager.create(VendorsCode, {
                        VENDOR_ID: savedVendor.VND_ID,
                        CODE_NUM: codeDto.CODE_NUM.trim(),
                        CODE_STATUS: codeDto.CODE_STATUS ?? 1,
                        CODE_REGDATE: now,
                    }),
                );
                await queryRunner.manager.save(VendorsCode, codeEntities);
            }

            if (createVendorDto.addresses?.length) {
                const addressEntities = createVendorDto.addresses.map(
                    (addrDto) =>
                        queryRunner.manager.create(VendorsAddress, {
                            VENDOR_ID: savedVendor.VND_ID,
                            ADDR_LINE1: addrDto.ADDR_LINE1 ?? null,
                            ADDR_LINE2: addrDto.ADDR_LINE2 ?? null,
                            ADDR_LINE3: addrDto.ADDR_LINE3 ?? null,
                            ADDR_CITY: addrDto.ADDR_CITY ?? null,
                            ADDR_COUNTRY: addrDto.ADDR_COUNTRY ?? null,
                            ADDR_ZIPCODE: addrDto.ADDR_ZIPCODE ?? null,
                            ADDR_STATUS: addrDto.ADDR_STATUS ?? 1,
                        }),
                );
                await queryRunner.manager.save(VendorsAddress, addressEntities);
            }

            await queryRunner.commitTransaction();

            return this.findOne(savedVendor.VND_ID);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * อัปเดตข้อมูลคู่ค้า
     */
    async update(
        id: number,
        updateVendorDto: UpdateVendorDto,
        username?: string,
    ) {
        const vendor = await this.findOne(id);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const now = new Date();

            if (updateVendorDto.VND_NAME !== undefined) {
                vendor.VND_NAME = updateVendorDto.VND_NAME.trim();
            }
            if (updateVendorDto.VND_LONGNAME !== undefined) {
                vendor.VND_LONGNAME = updateVendorDto.VND_LONGNAME?.trim() ?? null;
            }
            if (updateVendorDto.VND_TYPE !== undefined) {
                vendor.VND_TYPE = updateVendorDto.VND_TYPE?.trim() ?? null;
            }
            if (updateVendorDto.VND_STATUS !== undefined) {
                vendor.VND_STATUS = updateVendorDto.VND_STATUS;
            }
            vendor.VND_USERUPDATE = username ?? vendor.VND_USERUPDATE;
            vendor.VND_LASTUPDATE = now;

            await queryRunner.manager.save(Vendors, vendor);

            // หากมีการส่ง codes มาทดแทน
            if (updateVendorDto.codes !== undefined) {
                // ลบ codes เดิมของ vendor นี้
                await queryRunner.manager.delete(VendorsCode, {
                    VENDOR_ID: id,
                });

                if (updateVendorDto.codes.length > 0) {
                    const codeEntities = updateVendorDto.codes.map((c) =>
                        queryRunner.manager.create(VendorsCode, {
                            VENDOR_ID: id,
                            CODE_NUM: c.CODE_NUM.trim(),
                            CODE_STATUS: c.CODE_STATUS ?? 1,
                            CODE_REGDATE: now,
                        }),
                    );
                    await queryRunner.manager.save(VendorsCode, codeEntities);
                }
            }

            // หากมีการส่ง addresses มาทดแทน
            if (updateVendorDto.addresses !== undefined) {
                await queryRunner.manager.delete(VendorsAddress, {
                    VENDOR_ID: id,
                });

                if (updateVendorDto.addresses.length > 0) {
                    const addressEntities = updateVendorDto.addresses.map((a) =>
                        queryRunner.manager.create(VendorsAddress, {
                            VENDOR_ID: id,
                            ADDR_LINE1: a.ADDR_LINE1 ?? null,
                            ADDR_LINE2: a.ADDR_LINE2 ?? null,
                            ADDR_LINE3: a.ADDR_LINE3 ?? null,
                            ADDR_CITY: a.ADDR_CITY ?? null,
                            ADDR_COUNTRY: a.ADDR_COUNTRY ?? null,
                            ADDR_ZIPCODE: a.ADDR_ZIPCODE ?? null,
                            ADDR_STATUS: a.ADDR_STATUS ?? 1,
                        }),
                    );
                    await queryRunner.manager.save(
                        VendorsAddress,
                        addressEntities,
                    );
                }
            }

            await queryRunner.commitTransaction();

            return this.findOne(id);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * ลบคู่ค้า (Cascade ลบ codes และ addresses โดย Database Constraint)
     */
    async remove(id: number) {
        await this.findOne(id);
        await this.vendorsRepository.delete(id);
        return {
            message: `ลบข้อมูลคู่ค้า ID #${id} สำเร็จ`,
        };
    }
}
