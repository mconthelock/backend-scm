import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryVendorDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    status?: number;

    @IsOptional()
    @IsString()
    type?: string;
}
