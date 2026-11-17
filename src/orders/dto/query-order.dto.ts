import { Type } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class QueryOrderDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['ISSUED', 'READ', 'ACKNOWLEDGED', 'PARTIAL_SHIPPED', 'SHIPPED', 'CLOSED'])
    status?: string;

    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;

    @IsOptional()
    @IsString()
    plantCode?: string;

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
