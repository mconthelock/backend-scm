import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
    @Type(() => Number)
    @IsNumber()
    ORD_ID: number;

    @IsString()
    ORD_PONO: string;

    @Type(() => Number)
    @IsNumber()
    ORD_REVISION: number;

    @Type(() => Number)
    @IsNumber()
    ORD_DOCREV: number;

    @Type(() => Number)
    @IsNumber()
    ORD_TYPE: number;

    @Type(() => Date)
    @IsDate()
    ORD_PODATE: Date;

    @IsString()
    ORD_REFNO: string;

    @IsString()
    ORD_SHIPTO: string;

    @IsString()
    ORD_SHIPBY: string;

    @IsString()
    ORD_CURRENCY: string;

    @IsString()
    ORD_PAYMENT: string;

    @IsString()
    ORD_TRADE: string;

    @IsString()
    VENDORCODE: string;

    @Type(() => Number)
    @IsNumber()
    VENDOR: number;

    @Type(() => Number)
    @IsNumber()
    ADDR: number;

    @IsString()
    BUYERCODE: string;

    @IsString()
    BUYER: string;

    @Type(() => Number)
    @IsNumber()
    ORD_AMOUNT: number;

    @Type(() => Number)
    @IsNumber()
    ORD_STATUS: number;

    @IsString()
    ORD_BUYERCOMMENT: string;

    @IsString()
    ORD_VENDORCOMMENT: string;

    @Type(() => Number)
    @IsNumber()
    ORD_CLOSED: number;

    @Type(() => Number)
    @IsNumber()
    ORD_LATEST: number;

    @Type(() => Date)
    @IsDate()
    ORD_LASTUPDATE: Date;
}
