import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { Users } from '../entities/table/users.entity.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * เข้าสู่ระบบด้วย username / password (ผ่าน Passport LocalStrategy)
     * เปิดเป็น Public ไม่ต้องใช้ JWT Token
     */
    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() _loginDto: LoginDto, @CurrentUser() user: Users) {
        return this.authService.login(user);
    }

    /**
     * ลงทะเบียนผู้ใช้งานใหม่ (เฉพาะระบบภายใน/ผู้ที่ล็อกอินแล้วเท่านั้น)
     */
    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    /**
     * ดึงข้อมูลผู้ใช้งานปัจจุบันจาก JWT Access Token
     */
    @Get('profile')
    getProfile(@CurrentUser() user: Users) {
        return this.authService.getProfile(user.USR_ID);
    }

    /**
     * ร้องขอการรีเซ็ตรหัสผ่าน (ลืมรหัสผ่าน)
     */
    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    /**
     * ตั้งรหัสผ่านใหม่ด้วย Reset Token
     */
    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }

    /**
     * เปลี่ยนรหัสผ่านและเก็บรหัสผ่านเก่าไว้ใน PWD_PREVIOUS
     */
    @Patch('change-password')
    changePassword(
        @CurrentUser() user: Users,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(user.USR_ID, changePasswordDto);
    }

    /**
     * รองรับ POST /auth/change-password เพิ่มเติมเพื่อความสะดวกในการเรียกใช้งาน
     */
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    changePasswordPost(
        @CurrentUser() user: Users,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(user.USR_ID, changePasswordDto);
    }

    /**
     * ออกจากระบบและเพิกถอน Access Token ปัจจุบัน
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Req() req: Request) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? undefined;
        return this.authService.logout(token);
    }
}
