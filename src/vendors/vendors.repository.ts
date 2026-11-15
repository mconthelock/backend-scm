import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../common/helpers/base-repository.js';
import { Vendors } from '../entities/table/vendors.entity.js';
import { VendorsAddress } from '../entities/table/vendors-address.entity.js';

@Injectable()
export class VendorsRepository extends BaseRepository {
    constructor(@InjectDataSource('dbConnection') ds: DataSource) {
        super(ds);
    }

    async findVendorByCode(code: string) {
        return this.getRepository(Vendors).findOne({
            where: { VND_CODE: code },
            relations: {
                addresses: true,
            },
        });
    }

    async createVendor(data: Partial<Vendors>) {
        const repo = this.getRepository(Vendors);
        const entity = repo.create(data);
        return repo.save(entity);
    }

    async createAddress(data: Partial<VendorsAddress>) {
        const repo = this.getRepository(VendorsAddress);
        const entity = repo.create(data);
        return repo.save(entity);
    }

    async createAddresses(data: Partial<VendorsAddress>[]) {
        const repo = this.getRepository(VendorsAddress);
        const entities = repo.create(data);
        return repo.save(entities);
    }

    async deleteAddressesByVendor(vendorCode: string) {
        return this.getRepository(VendorsAddress).delete({ VENDOR_ID: vendorCode });
    }
}
