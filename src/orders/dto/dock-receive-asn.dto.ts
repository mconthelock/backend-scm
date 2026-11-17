import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

export class DockReceiveItemDto {
    @IsNotEmpty({ message: 'กรุณาระบุ poItemId' })
    @Type(() => Number)
    @IsInt()
    poItemId: number;

    @IsNotEmpty({ message: 'กรุณาระบุจำนวนที่รับจริง (receivedQty)' })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    receivedQty: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    rejectedQty?: number = 0;

    @IsOptional()
    @IsIn(['PASSED', 'FAILED', 'CONDITIONAL'])
    qaStatus?: string = 'PASSED';
}

export class DockReceiveAsnDto {
    @IsNotEmpty({ message: 'กรุณาระบุเวลาที่รถถึงจริง (actualArrivalTime)' })
    @IsString()
    actualArrivalTime: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ' })
    @ValidateNested({ each: true })
    @Type(() => DockReceiveItemDto)
    items: DockReceiveItemDto[];
}
