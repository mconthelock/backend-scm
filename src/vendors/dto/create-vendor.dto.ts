import { Type } from 'class-transformer';
import {
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';

export class CreateVendorAddressDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    ADDR_LINE1?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    ADDR_LINE2?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    ADDR_LINE3?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    ADDR_CITY?: string;

    @IsOptional()
    @IsInt()
    ADDR_COUNTRY?: number;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    ADDR_ZIPCODE?: string;

    @IsOptional()
    @IsInt()
    ADDR_STATUS?: number;
}

export class CreateVendorDto {
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุรหัสคู่ค้า (VND_CODE)' })
    @MaxLength(6, { message: 'รหัสคู่ค้าต้องมีความยาวไม่เกิน 6 ตัวอักษร' })
    VND_CODE: string;

    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุชื่อย่อหรือชื่อทางการค้า (VND_NAME)' })
    @MaxLength(150)
    VND_NAME: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    VND_LONGNAME?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    VND_TYPE?: string;

    @IsOptional()
    @IsInt()
    VND_STATUS?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVendorAddressDto)
    addresses?: CreateVendorAddressDto[];
}
