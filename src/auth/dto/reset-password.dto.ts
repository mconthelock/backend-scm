import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุ Reset Token' })
    token: string;

    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่านใหม่ (newPassword)' })
    @MinLength(6, { message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    newPassword: string;
}
