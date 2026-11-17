import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AcknowledgeOrderDto {
    @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ลงนาม (signerName)' })
    @IsString()
    signerName: string;

    @IsNotEmpty({ message: 'กรุณาระบุตำแหน่งผู้ลงนาม (signerPosition)' })
    @IsString()
    signerPosition: string;

    @IsOptional()
    @IsString()
    vendorComment?: string;

    @IsOptional()
    @IsString()
    digitalSignatureHash?: string;
}
