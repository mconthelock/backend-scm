import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../src/auth/auth.service.js';
import { MailService } from '../../../src/common/mail/mail.service.js';
import { Users } from '../../../src/entities/table/users.entity.js';
import { UsersPassword } from '../../../src/entities/table/users-password.entity.js';

describe('AuthService', () => {
    let service: AuthService;

    const mockUsersRepository = {
        findOne: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
    };

    const mockUsersPasswordRepository = {
        findOne: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
    };

    const mockJwtService = {
        signAsync: vi.fn().mockResolvedValue('mock-jwt-access-token'),
        decode: vi.fn().mockReturnValue({
            sub: 1,
            exp: Math.floor(Date.now() / 1000) + 3600,
        }),
    };

    const mockConfigService = {
        get: vi.fn((key: string) => {
            if (key === 'PASSWORD_HASH_ALGO') return 'sha256';
            if (key === 'JWT_EXPIRES_IN') return '1d';
            if (key === 'JWT_SECRET') return 'test-secret';
            return undefined;
        }),
    };

    const mockMailService = {
        sendMail: vi.fn().mockResolvedValue(undefined),
        sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    };

    const sampleUser: Users = {
        USR_ID: 1,
        USR_LOGIN: 'tester',
        USR_NAME: 'Test User',
        USR_EMAIL: 'tester@example.com',
        USR_REGISTDATE: new Date('2026-01-01T00:00:00Z'),
        USR_RESETDATE: null,
        USR_PIC: null,
        USR_PIC_EMAIL: null,
        USR_STATUS: 1,
        GROUPS: 16,
        VENDORS: null,
        PROD_ID: null,
        USR_PDPA: 0,
        USR_LASTLOGIN: null,
        USR_LASTUPDATE: new Date('2026-01-01T00:00:00Z'),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(Users, 'dbConnection'),
                    useValue: mockUsersRepository,
                },
                {
                    provide: getRepositoryToken(UsersPassword, 'dbConnection'),
                    useValue: mockUsersPasswordRepository,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: MailService,
                    useValue: mockMailService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('hashPassword & verifyPassword', () => {
        it('should verify MD5 hashed password accurately (legacy 32 chars)', () => {
            const hashMd5 = createHash('md5')
                .update('Secret123!')
                .digest('hex');
            expect(service.verifyPassword('Secret123!', hashMd5)).toBe(true);
            expect(service.verifyPassword('WrongPass', hashMd5)).toBe(false);
        });

        it('should verify SHA-256 hashed password accurately', () => {
            const hash256 = createHash('sha256')
                .update('Secret123!')
                .digest('hex');
            expect(service.verifyPassword('Secret123!', hash256)).toBe(true);
            expect(service.verifyPassword('WrongPass', hash256)).toBe(false);
        });

        it('should verify SHA-512 hashed password accurately', () => {
            const hash512 = createHash('sha512')
                .update('Secret123!')
                .digest('hex');
            expect(service.verifyPassword('Secret123!', hash512)).toBe(true);
            expect(service.verifyPassword('WrongPass', hash512)).toBe(false);
        });
    });

    describe('validateUser', () => {
        it('should return user when credentials are valid', async () => {
            const hashedPwd = service.hashPassword('Secret123!');
            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            mockUsersPasswordRepository.findOne.mockResolvedValue({
                USERS: 1,
                PWD_CURRENT: hashedPwd,
                PWD_PREVIOUS: null,
                PWD_UPDATEDATE: new Date(),
            });

            const result = await service.validateUser('tester', 'Secret123!');
            expect(result).toBeDefined();
            expect(result?.USR_LOGIN).toBe('tester');
        });

        it('should throw ForbiddenException when user is inactive (USR_STATUS !== 1)', async () => {
            mockUsersRepository.findOne.mockResolvedValue({
                ...sampleUser,
                USR_STATUS: 0,
            });

            await expect(
                service.validateUser('tester', 'Secret123!'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should return null when password does not match', async () => {
            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            mockUsersPasswordRepository.findOne.mockResolvedValue({
                USERS: 1,
                PWD_CURRENT: service.hashPassword('Secret123!'),
                PWD_PREVIOUS: null,
                PWD_UPDATEDATE: new Date(),
            });

            const result = await service.validateUser('tester', 'WrongPass');
            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should update USR_LASTLOGIN and return JWT access token', async () => {
            mockUsersRepository.update.mockResolvedValue({ affected: 1 });
            const result = await service.login({ ...sampleUser });

            expect(mockUsersRepository.update).toHaveBeenCalledWith(
                { USR_ID: 1 },
                { USR_LASTLOGIN: expect.any(Date) },
            );
            expect(result.access_token).toBe('mock-jwt-access-token');
            expect(result.token_type).toBe('Bearer');
            expect(result.user.USR_LOGIN).toBe('tester');
        });
    });

    describe('register', () => {
        it('should create user and password record when USR_LOGIN is unique', async () => {
            mockUsersRepository.findOne.mockResolvedValue(null);
            mockUsersRepository.create.mockImplementation((dto) => ({
                ...dto,
                USR_ID: 2,
            }));
            mockUsersRepository.save.mockImplementation(async (u) => u);
            mockUsersPasswordRepository.create.mockImplementation((p) => p);
            mockUsersPasswordRepository.save.mockImplementation(async (p) => p);

            const res = await service.register({
                USR_LOGIN: 'newuser',
                password: 'Password123',
                USR_NAME: 'New User',
                USR_EMAIL: 'new@example.com',
            });

            expect(res.user.USR_LOGIN).toBe('newuser');
            expect(mockUsersPasswordRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    USERS: 2,
                    PWD_CURRENT: service.hashPassword('Password123'),
                    PWD_PREVIOUS: null,
                }),
            );
        });

        it('should throw ConflictException if USR_LOGIN already exists', async () => {
            mockUsersRepository.findOne.mockResolvedValue(sampleUser);

            await expect(
                service.register({
                    USR_LOGIN: 'tester',
                    password: 'Password123',
                    USR_NAME: 'Tester',
                    USR_EMAIL: 'tester@example.com',
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('changePassword', () => {
        it('should move current password to PWD_PREVIOUS and update PWD_CURRENT', async () => {
            const oldHash = service.hashPassword('OldPass123');
            const newHash = service.hashPassword('NewPass456');

            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            mockUsersPasswordRepository.findOne.mockResolvedValue({
                USERS: 1,
                PWD_CURRENT: oldHash,
                PWD_PREVIOUS: null,
                PWD_UPDATEDATE: new Date(),
            });
            mockUsersPasswordRepository.save.mockImplementation(async (p) => p);
            mockUsersRepository.update.mockResolvedValue({ affected: 1 });

            const res = await service.changePassword(1, {
                currentPassword: 'OldPass123',
                newPassword: 'NewPass456',
            });

            expect(res.message).toBe('เปลี่ยนรหัสผ่านสำเร็จ');
            expect(mockUsersPasswordRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    USERS: 1,
                    PWD_PREVIOUS: oldHash,
                    PWD_CURRENT: newHash,
                }),
            );
        });

        it('should throw UnauthorizedException when currentPassword is wrong', async () => {
            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            mockUsersPasswordRepository.findOne.mockResolvedValue({
                USERS: 1,
                PWD_CURRENT: service.hashPassword('OldPass123'),
                PWD_PREVIOUS: null,
                PWD_UPDATEDATE: new Date(),
            });

            await expect(
                service.changePassword(1, {
                    currentPassword: 'WrongCurrentPassword',
                    newPassword: 'NewPass456',
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw BadRequestException when newPassword equals currentPassword', async () => {
            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            mockUsersPasswordRepository.findOne.mockResolvedValue({
                USERS: 1,
                PWD_CURRENT: service.hashPassword('SamePass123'),
                PWD_PREVIOUS: null,
                PWD_UPDATEDATE: new Date(),
            });

            await expect(
                service.changePassword(1, {
                    currentPassword: 'SamePass123',
                    newPassword: 'SamePass123',
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('logout', () => {
        it('should revoke token on logout', () => {
            expect(service.isTokenRevoked('sample-token')).toBe(false);
            service.logout('sample-token');
            expect(service.isTokenRevoked('sample-token')).toBe(true);
        });
    });

    describe('forgotPassword & resetPassword', () => {
        it('should return safe message when identifier does not exist', async () => {
            mockUsersRepository.findOne.mockResolvedValue(null);
            const res = await service.forgotPassword({
                identifier: 'unknown_user',
            });
            expect(res.message).toContain('หากข้อมูลผู้ใช้งานถูกต้อง');
            expect(res.reset_token).toBeUndefined();
        });

        it('should return reset_token when identifier exists', async () => {
            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            const res = await service.forgotPassword({
                identifier: 'tester',
            });
            expect(res.message).toContain('หากข้อมูลผู้ใช้งานถูกต้อง');
            expect(res.reset_token).toBe('mock-jwt-access-token');
            expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
                sampleUser.USR_EMAIL,
                sampleUser.USR_NAME,
                'mock-jwt-access-token',
            );
        });

        it('should successfully reset password with valid token and revoke the token', async () => {
            const oldHash = service.hashPassword('OldPass123');
            (mockJwtService as any).verifyAsync = vi.fn().mockResolvedValue({
                sub: 1,
                type: 'reset_password',
            });

            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });
            mockUsersPasswordRepository.findOne.mockResolvedValue({
                USERS: 1,
                PWD_CURRENT: oldHash,
                PWD_PREVIOUS: null,
                PWD_UPDATEDATE: new Date(),
            });
            mockUsersPasswordRepository.save.mockImplementation(async (p) => p);
            mockUsersRepository.update.mockResolvedValue({ affected: 1 });

            const res = await service.resetPassword({
                token: 'valid-reset-token',
                newPassword: 'BrandNewPassword123',
            });

            expect(res.message).toContain('ตั้งรหัสผ่านใหม่สำเร็จ');
            expect(service.isTokenRevoked('valid-reset-token')).toBe(true);
        });
    });

    describe('verifyResetToken', () => {
        it('should throw BadRequestException if token is missing or empty', async () => {
            await expect(service.verifyResetToken('')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should return valid: false with reason REVOKED if token has been revoked', async () => {
            service.logout('revoked-token');
            const res = await service.verifyResetToken('revoked-token');
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('REVOKED');
        });

        it('should return valid: false with reason EXPIRED when token is expired', async () => {
            const expiredError = new Error('jwt expired');
            expiredError.name = 'TokenExpiredError';
            (mockJwtService as any).verifyAsync = vi
                .fn()
                .mockRejectedValue(expiredError);

            const res = await service.verifyResetToken('expired-token');
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('EXPIRED');
            expect(res.message).toContain('หมดอายุแล้ว');
        });

        it('should return valid: false with reason INVALID when token is invalid', async () => {
            const invalidError = new Error('invalid signature');
            invalidError.name = 'JsonWebTokenError';
            (mockJwtService as any).verifyAsync = vi
                .fn()
                .mockRejectedValue(invalidError);

            const res = await service.verifyResetToken('invalid-token');
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('INVALID');
        });

        it('should return valid: false with reason INVALID_TYPE if payload type is not reset_password', async () => {
            (mockJwtService as any).verifyAsync = vi.fn().mockResolvedValue({
                sub: 1,
                type: 'access_token',
            });

            const res = await service.verifyResetToken('access-token');
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('INVALID_TYPE');
        });

        it('should return valid: false if user does not exist or is inactive', async () => {
            (mockJwtService as any).verifyAsync = vi.fn().mockResolvedValue({
                sub: 999,
                type: 'reset_password',
            });
            mockUsersRepository.findOne.mockResolvedValue(null);

            const res = await service.verifyResetToken('valid-token-no-user');
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('USER_INACTIVE');
        });

        it('should return valid: true with details if token is valid and user is active', async () => {
            const exp = Math.floor(Date.now() / 1000) + 900;
            (mockJwtService as any).verifyAsync = vi.fn().mockResolvedValue({
                sub: 1,
                type: 'reset_password',
                exp,
            });
            mockUsersRepository.findOne.mockResolvedValue({ ...sampleUser });

            const res = await service.verifyResetToken('valid-active-token');
            expect(res.valid).toBe(true);
            expect(res.userId).toBe(1);
            expect(res.username).toBe(sampleUser.USR_LOGIN);
            expect(res.email).toBe(sampleUser.USR_EMAIL);
            expect(res.expiresAt).toBeDefined();
        });
    });
});
