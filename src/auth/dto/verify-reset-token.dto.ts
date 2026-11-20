import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyResetTokenDto {
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุ Reset Token' })
    token: string;
}
