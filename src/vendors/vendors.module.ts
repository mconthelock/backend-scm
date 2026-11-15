import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service.js';
import { VendorsController } from './vendors.controller.js';
import { VendorsRepository } from './vendors.repository.js';
import { Vendors } from '../entities/table/vendors.entity.js';
import { VendorsAddress } from '../entities/table/vendors-address.entity.js';
import { VendorsGroup } from '../entities/table/vendors-group.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [Vendors, VendorsAddress, VendorsGroup],
            'dbConnection',
        ),
    ],
    controllers: [VendorsController],
    providers: [VendorsService, VendorsRepository],
    exports: [VendorsService, VendorsRepository],
})
export class VendorsModule {}
