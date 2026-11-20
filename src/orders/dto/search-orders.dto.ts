import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateOrderDto } from './create-order.dto.js';

export class SearchOrdersDto extends PartialType(CreateOrderDto) {
    @IsOptional()
    @IsString()
    START_ORD_PODATE?: string;

    @IsOptional()
    @IsString()
    END_ORD_PODATE?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
