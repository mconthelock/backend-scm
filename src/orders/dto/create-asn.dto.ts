import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

export class CreateAsnItemDto {
    @IsNotEmpty({ message: 'กรุณาระบุ poItemId' })
    @Type(() => Number)
    @IsInt()
    poItemId: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    shipmentScheduleId?: number;

    @IsNotEmpty({ message: 'กรุณาระบุจำนวนที่ส่ง (dispatchQty)' })
    @Type(() => Number)
    @IsNumber()
    @Min(0.0001, { message: 'จำนวนต้องมากกว่า 0' })
    dispatchQty: number;

    @IsOptional()
    @IsString()
    lotBatchNo?: string;

    @IsOptional()
    @IsString()
    packageCrateNo?: string;
}

export class CreateAsnDto {
    @IsNotEmpty({ message: 'กรุณาระบุ poId' })
    @Type(() => Number)
    @IsInt()
    poId: number;

    @IsNotEmpty({ message: 'กรุณาระบุชื่อบริษัทขนส่ง (carrierName)' })
    @IsString()
    carrierName: string;

    @IsNotEmpty({ message: 'กรุณาระบุทะเบียนรถ (truckPlateNo)' })
    @IsString()
    truckPlateNo: string;

    @IsNotEmpty({ message: 'กรุณาระบุชื่อพนักงานขับรถ (driverName)' })
    @IsString()
    driverName: string;

    @IsNotEmpty({ message: 'กรุณาระบุเบอร์โทรคนขับ (driverPhone)' })
    @IsString()
    driverPhone: string;

    @IsNotEmpty({ message: 'กรุณาระบุเวลาออกเดินทาง (dispatchTime)' })
    @IsString()
    dispatchTime: string;

    @IsNotEmpty({ message: 'กรุณาระบุเวลาประมาณการถึง (estimatedArrivalTime)' })
    @IsString()
    estimatedArrivalTime: string;

    @IsOptional()
    @IsString()
    receivingDock?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ' })
    @ValidateNested({ each: true })
    @Type(() => CreateAsnItemDto)
    items: CreateAsnItemDto[];
}
