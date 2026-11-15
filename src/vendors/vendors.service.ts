import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendors } from '../entities/table/vendors.entity.js';
import { VendorsAddress } from '../entities/table/vendors-address.entity.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { QueryVendorDto } from './dto/query-vendor.dto.js';
import { VendorsRepository } from './vendors.repository.js';

@Injectable()
export class VendorsService {
    constructor(
        @InjectRepository(Vendors, 'dbConnection')
        private readonly vendorsRepository: Repository<Vendors>,
        @InjectRepository(VendorsAddress, 'dbConnection')
        private readonly vendorsAddressRepository: Repository<VendorsAddress>,
        private readonly vndRepo: VendorsRepository,
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
            .leftJoinAndSelect('vendor.addresses', 'addresses');

        if (query.search) {
            const searchKeyword = `%${query.search.trim()}%`;
            qb.andWhere(
                '(vendor.VND_CODE LIKE :search OR vendor.VND_NAME LIKE :search OR vendor.VND_LONGNAME LIKE :search)',
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

        qb.orderBy('vendor.VND_REGDATE', 'DESC').skip(skip).take(limit);

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
     * ดึงข้อมูล Vendor ตาม VND_CODE พร้อม Relations (addresses)
     */
    async findOne(code: string) {
        const vendor = await this.vndRepo.findVendorByCode(code);

        if (!vendor) {
            throw new NotFoundException(`ไม่พบข้อมูลคู่ค้า รหัส '${code}'`);
        }

        return vendor;
    }

    /**
     * สร้างคู่ค้าใหม่ พร้อมที่อยู่ (addresses)
     */
    async create(createVendorDto: CreateVendorDto, username?: string) {
        const code = createVendorDto.VND_CODE.trim();
        const existing = await this.vendorsRepository.findOne({
            where: { VND_CODE: code },
        });

        if (existing) {
            throw new ConflictException(
                `รหัสคู่ค้า (VND_CODE) '${code}' มีอยู่ในระบบแล้ว`,
            );
        }

        const now = new Date();
        const vendorData: Partial<Vendors> = {
            VND_CODE: code,
            VND_NAME: createVendorDto.VND_NAME.trim(),
            VND_LONGNAME: createVendorDto.VND_LONGNAME?.trim() ?? null,
            VND_TYPE: createVendorDto.VND_TYPE?.trim() ?? null,
            VND_STATUS: createVendorDto.VND_STATUS ?? 1,
            VND_USERUPDATE: username ?? null,
            VND_REGDATE: now,
            VND_LASTUPDATE: now,
        };

        const savedVendor = await this.vndRepo.createVendor(vendorData);

        if (createVendorDto.addresses?.length) {
            const addressEntities = createVendorDto.addresses.map((addrDto) => ({
                VENDOR_ID: savedVendor.VND_CODE,
                ADDR_LINE1: addrDto.ADDR_LINE1 ?? null,
                ADDR_LINE2: addrDto.ADDR_LINE2 ?? null,
                ADDR_LINE3: addrDto.ADDR_LINE3 ?? null,
                ADDR_CITY: addrDto.ADDR_CITY ?? null,
                ADDR_COUNTRY: addrDto.ADDR_COUNTRY ?? null,
                ADDR_ZIPCODE: addrDto.ADDR_ZIPCODE ?? null,
                ADDR_STATUS: addrDto.ADDR_STATUS ?? 1,
            }));
            await this.vndRepo.createAddresses(addressEntities);
        }

        return this.findOne(savedVendor.VND_CODE);
    }

    /**
     * อัปเดตข้อมูลคู่ค้า
     */
    async update(
        code: string,
        updateVendorDto: UpdateVendorDto,
        username?: string,
    ) {
        const vendor = await this.findOne(code);
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

        await this.vndRepo.createVendor(vendor);

        // หากมีการส่ง addresses มาทดแทน
        if (updateVendorDto.addresses !== undefined) {
            await this.vndRepo.deleteAddressesByVendor(code);

            if (updateVendorDto.addresses.length > 0) {
                const addressEntities = updateVendorDto.addresses.map((a) => ({
                    VENDOR_ID: code,
                    ADDR_LINE1: a.ADDR_LINE1 ?? null,
                    ADDR_LINE2: a.ADDR_LINE2 ?? null,
                    ADDR_LINE3: a.ADDR_LINE3 ?? null,
                    ADDR_CITY: a.ADDR_CITY ?? null,
                    ADDR_COUNTRY: a.ADDR_COUNTRY ?? null,
                    ADDR_ZIPCODE: a.ADDR_ZIPCODE ?? null,
                    ADDR_STATUS: a.ADDR_STATUS ?? 1,
                }));
                await this.vndRepo.createAddresses(addressEntities);
            }
        }

        return this.findOne(code);
    }

    /**
     * ลบคู่ค้า (Cascade ลบ addresses โดย Database Constraint)
     */
    async remove(code: string) {
        await this.findOne(code);
        await this.vendorsRepository.delete({ VND_CODE: code });
        return {
            message: `ลบข้อมูลคู่ค้า รหัส '${code}' สำเร็จ`,
        };
    }
}
