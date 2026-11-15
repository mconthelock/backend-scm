import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class RegisterDto {
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ใช้งาน (USR_LOGIN)' })
    @MaxLength(50)
    USR_LOGIN: string;

    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่าน (password)' })
    @MinLength(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุชื่อ-นามสกุล (USR_NAME)' })
    @MaxLength(150)
    USR_NAME: string;

    @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง (USR_EMAIL)' })
    @IsNotEmpty({ message: 'กรุณาระบุอีเมล (USR_EMAIL)' })
    @MaxLength(150)
    USR_EMAIL: string;

    @IsOptional()
    @IsInt()
    USR_PIC?: number;

    @IsOptional()
    @IsEmail()
    @MaxLength(150)
    USR_PIC_EMAIL?: string;

    @IsOptional()
    @IsInt()
    GROUPS?: number;

    @IsOptional()
    @IsInt()
    VENDORS?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    PROD_ID?: string;
}
