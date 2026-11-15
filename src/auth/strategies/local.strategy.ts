import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service.js';
import { Users } from '../../entities/table/users.entity.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(private readonly authService: AuthService) {
        super({
            usernameField: 'username',
            passwordField: 'password',
        });
    }

    async validate(username: string, password: string): Promise<Users> {
        const user = await this.authService.validateUser(username, password);
        if (!user) {
            throw new UnauthorizedException(
                'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง',
            );
        }
        return user;
    }
}
