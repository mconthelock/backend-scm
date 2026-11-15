import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service.js';
import { VendorsController } from './vendors.controller.js';
import { Vendors } from '../entities/table/vendors.entity.js';
import { VendorsCode } from '../entities/table/vendors-code.entity.js';
import { VendorsAddress } from '../entities/table/vendors-address.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [Vendors, VendorsCode, VendorsAddress],
            'dbConnection',
        ),
    ],
    controllers: [VendorsController],
    providers: [VendorsService],
    exports: [VendorsService],
})
export class VendorsModule {}
