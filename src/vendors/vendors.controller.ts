import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import {
    UseForceTransaction,
    UseTransaction,
} from '../common/helpers/transaction.decorator.js';
import { VendorsService } from './vendors.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { QueryVendorDto } from './dto/query-vendor.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Users } from '../entities/table/users.entity.js';

@Controller({
    path: 'vendors',
    version: '1',
})
export class VendorsController {
    constructor(private readonly vendorsService: VendorsService) {}

    /**
     * ดึงรายการคู่ค้าทั้งหมด (Pagination & Filters)
     */
    @Get()
    findAll(@Query() query: QueryVendorDto) {
        return this.vendorsService.findAll(query);
    }

    /**
     * ดึงรายละเอียดคู่ค้าตาม VND_CODE
     */
    @Get(':code')
    findOne(@Param('code') code: string) {
        return this.vendorsService.findOne(code);
    }

    /**
     * สร้างคู่ค้าใหม่
     */
    @Post()
    @UseTransaction('dbConnection')
    @UseForceTransaction()
    create(
        @Body() createVendorDto: CreateVendorDto,
        @CurrentUser() user?: Users,
    ) {
        return this.vendorsService.create(createVendorDto, user?.USR_LOGIN);
    }

    /**
     * แก้ไขข้อมูลคู่ค้า
     */
    @Patch(':code')
    @UseTransaction('dbConnection')
    @UseForceTransaction()
    update(
        @Param('code') code: string,
        @Body() updateVendorDto: UpdateVendorDto,
        @CurrentUser() user?: Users,
    ) {
        return this.vendorsService.update(
            code,
            updateVendorDto,
            user?.USR_LOGIN,
        );
    }

    /**
     * ลบคู่ค้า
     */
    @Delete(':code')
    remove(@Param('code') code: string) {
        return this.vendorsService.remove(code);
    }
}
