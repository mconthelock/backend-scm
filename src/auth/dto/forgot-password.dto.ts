import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ใช้งาน (username) หรืออีเมล' })
    identifier: string;
}
