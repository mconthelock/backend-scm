import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateShipmentScheduleDto {
    @IsNotEmpty({ message: 'กรุณาระบุจำนวนที่นัดส่ง (scheduledQty)' })
    @Type(() => Number)
    @IsNumber()
    @Min(0.0001, { message: 'จำนวนต้องมากกว่า 0' })
    scheduledQty: number;

    @IsNotEmpty({ message: 'กรุณาระบุวันนัดส่งมอบ (promisedShipDate)' })
    @IsString()
    promisedShipDate: string;

    @IsNotEmpty({
        message: 'กรุณาระบุวันประมาณการถึงปลายทาง (estimatedArrivalDate)',
    })
    @IsString()
    estimatedArrivalDate: string;

    @IsOptional()
    @IsString()
    vendorRemarks?: string;
}
