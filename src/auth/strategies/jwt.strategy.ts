import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get<string>('JWT_SECRET') ||
                process.env.JWT_SECRET ||
                'amec-scm-jwt-secret-key',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload) {
        // ป้องกันไม่ให้ reset_token ถูกนำมาใช้เป็น Access Token ทั่วไป
        if (payload.type && payload.type !== 'access_token') {
            throw new UnauthorizedException('Token ไม่ถูกต้องสำหรับการเข้าใช้งาน');
        }

        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (token && this.authService.isTokenRevoked(token)) {
            throw new UnauthorizedException(
                'Token นี้ถูกยกเลิกการใช้งานแล้ว กรุณาเข้าสู่ระบบใหม่',
            );
        }

        const user = await this.authService.validateJwtPayload(payload);
        if (!user) {
            throw new UnauthorizedException(
                'ไม่พบข้อมูลผู้ใช้งาน หรือบัญชีถูกระงับการใช้งาน',
            );
        }

        return user;
    }
}
