import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Query,
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
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { Users } from '../entities/table/users.entity.js';

@Controller({
    path: 'auth',
    version: '1',
})
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
    login(
        @Body() _loginDto: LoginDto,
        @CurrentUser() user: Users,
        @Req() req: Request,
    ) {
        return this.authService.login(user, req);
    }

    /**
     * ลงทะเบียนผู้ใช้งานใหม่ (เฉพาะระบบภายใน/ผู้ที่ล็อกอินแล้วเท่านั้น)
     */
    @Post('register')
    register(
        @Body() registerDto: RegisterDto,
        @Req() req: Request,
        @CurrentUser() user?: Users,
    ) {
        return this.authService.register(registerDto, req, user);
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
    forgotPassword(
        @Body() forgotPasswordDto: ForgotPasswordDto,
        @Req() req: Request,
    ) {
        return this.authService.forgotPassword(forgotPasswordDto, req);
    }

    /**
     * ตรวจสอบว่า Reset Password Token ยังใช้งานได้หรือไม่ (ยังไม่หมดอายุและยังไม่ถูกใช้งาน)
     * รองรับทั้ง Query String เช่น GET /auth/verify-reset-token?token=...
     */
    @Public()
    @Get('verify-reset-token')
    verifyResetToken(@Query('token') token: string) {
        return this.authService.verifyResetToken(token);
    }

    /**
     * ตรวจสอบว่า Reset Password Token ยังใช้งานได้หรือไม่ (POST /auth/verify-reset-token)
     */
    @Public()
    @Post('verify-reset-token')
    @HttpCode(HttpStatus.OK)
    verifyResetTokenPost(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
        return this.authService.verifyResetToken(verifyResetTokenDto.token);
    }

    /**
     * ตั้งรหัสผ่านใหม่ด้วย Reset Token
     */
    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    resetPassword(
        @Body() resetPasswordDto: ResetPasswordDto,
        @Req() req: Request,
    ) {
        return this.authService.resetPassword(resetPasswordDto, req);
    }

    /**
     * เปลี่ยนรหัสผ่านและเก็บรหัสผ่านเก่าไว้ใน PWD_PREVIOUS
     */
    @Patch('change-password')
    changePassword(
        @CurrentUser() user: Users,
        @Body() changePasswordDto: ChangePasswordDto,
        @Req() req: Request,
    ) {
        return this.authService.changePassword(
            user.USR_ID,
            changePasswordDto,
            req,
        );
    }

    /**
     * รองรับ POST /auth/change-password เพิ่มเติมเพื่อความสะดวกในการเรียกใช้งาน
     */
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    changePasswordPost(
        @CurrentUser() user: Users,
        @Body() changePasswordDto: ChangePasswordDto,
        @Req() req: Request,
    ) {
        return this.authService.changePassword(
            user.USR_ID,
            changePasswordDto,
            req,
        );
    }

    /**
     * ออกจากระบบและเพิกถอน Access Token ปัจจุบัน
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Req() req: Request, @CurrentUser() user?: Users) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? undefined;
        return this.authService.logout(token, req, user);
    }
}
