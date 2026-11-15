import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../../../src/auth/auth.controller.js';
import { AuthService } from '../../../src/auth/auth.service.js';
import { Users } from '../../../src/entities/table/users.entity.js';

describe('AuthController', () => {
    let controller: AuthController;

    const mockAuthService = {
        login: vi.fn(),
        register: vi.fn(),
        getProfile: vi.fn(),
        changePassword: vi.fn(),
        logout: vi.fn(),
    };

    const sampleUser: Users = {
        USR_ID: 1,
        USR_LOGIN: 'tester',
        USR_NAME: 'Test User',
        USR_EMAIL: 'tester@example.com',
        USR_REGISTDATE: new Date(),
        USR_RESETDATE: null,
        USR_PIC: null,
        USR_PIC_EMAIL: null,
        USR_STATUS: 1,
        GROUPS: 16,
        VENDORS: null,
        PROD_ID: null,
        USR_PDPA: 0,
        USR_LASTLOGIN: null,
        USR_LASTUPDATE: new Date(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call authService.login on POST /auth/login', async () => {
        const expected = {
            access_token: 'jwt-token',
            token_type: 'Bearer',
            expires_in: '1d',
            user: sampleUser,
        };
        mockAuthService.login.mockResolvedValue(expected);

        const result = await controller.login(
            { username: 'tester', password: 'Secret' },
            sampleUser,
        );
        expect(mockAuthService.login).toHaveBeenCalledWith(sampleUser);
        expect(result).toEqual(expected);
    });

    it('should call authService.getProfile on GET /auth/profile', async () => {
        mockAuthService.getProfile.mockResolvedValue(sampleUser);
        const result = await controller.getProfile(sampleUser);
        expect(mockAuthService.getProfile).toHaveBeenCalledWith(1);
        expect(result).toEqual(sampleUser);
    });
});
