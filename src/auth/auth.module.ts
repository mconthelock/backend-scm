import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { Users } from '../entities/table/users.entity.js';
import { UsersPassword } from '../entities/table/users-password.entity.js';
import { MailModule } from '../common/mail/mail.module.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([Users, UsersPassword], 'dbConnection'),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        MailModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') ||
                    '1d') as StringValue;
                return {
                    secret:
                        configService.get<string>('JWT_SECRET') ||
                        'amec-scm-jwt-secret-key',
                    signOptions: {
                        expiresIn,
                    },
                };
            },
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        LocalAuthGuard,
        JwtAuthGuard,
    ],
    exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard],
})
export class AuthModule {}
