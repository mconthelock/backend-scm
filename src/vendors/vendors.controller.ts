import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { VendorsService } from './vendors.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { QueryVendorDto } from './dto/query-vendor.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Users } from '../entities/table/users.entity.js';

@Controller('vendors')
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
     * ดึงรายละเอียดคู่ค้าตาม ID
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.vendorsService.findOne(id);
    }

    /**
     * สร้างคู่ค้าใหม่
     */
    @Post()
    create(
        @Body() createVendorDto: CreateVendorDto,
        @CurrentUser() user?: Users,
    ) {
        return this.vendorsService.create(createVendorDto, user?.USR_LOGIN);
    }

    /**
     * แก้ไขข้อมูลคู่ค้า
     */
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateVendorDto: UpdateVendorDto,
        @CurrentUser() user?: Users,
    ) {
        return this.vendorsService.update(
            id,
            updateVendorDto,
            user?.USR_LOGIN,
        );
    }

    /**
     * ลบคู่ค้า
     */
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.vendorsService.remove(id);
    }
}
