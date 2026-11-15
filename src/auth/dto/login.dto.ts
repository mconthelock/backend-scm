import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
    @Transform(({ value, obj }) => value ?? obj?.USR_LOGIN)
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุชื่อผู้ใช้งาน (username)' })
    username: string;

    @Transform(({ value, obj }) => value ?? obj?.PWD_CURRENT)
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่าน (password)' })
    password: string;
}
