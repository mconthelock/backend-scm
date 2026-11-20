import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShipmentScheduleDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0.0001, { message: 'จำนวนต้องมากกว่า 0' })
    scheduledQty?: number;

    @IsOptional()
    @IsString()
    promisedShipDate?: string;

    @IsOptional()
    @IsString()
    estimatedArrivalDate?: string;

    @IsOptional()
    @IsString()
    vendorRemarks?: string;
}
