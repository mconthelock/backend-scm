import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessLogService } from '../../../src/common/access-log/access-log.service.js';
import { AccessLog } from '../../../src/entities/table/access-log.entity.js';

describe('AccessLogService', () => {
    let service: AccessLogService;

    const mockAccessLogRepository = {
        create: vi.fn((dto) => dto),
        save: vi.fn(async (entity) => ({ LOG_ID: 1, ...entity })),
    };

    const mockConfigService = {
        get: vi.fn((key: string) => {
            if (key === 'HOST') return 'HOME';
            return undefined;
        }),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccessLogService,
                {
                    provide: getRepositoryToken(AccessLog, 'dbConnection'),
                    useValue: mockAccessLogRepository,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<AccessLogService>(AccessLogService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log successfully with request object', async () => {
        const mockReq = {
            headers: {
                'user-agent': 'Mozilla/5.0 TestBrowser',
                'x-forwarded-for': '203.0.113.195, 10.0.0.1',
                'x-session-id': 'session-xyz',
                'x-request-id': 'req-12345',
                host: 'scm.amec.co.th',
            },
            method: 'POST',
            originalUrl: '/api/v1/auth/login',
        } as any;

        const result = await service.log({
            req: mockReq,
            program: 'LOGIN',
            user: 'admin',
            status: 1,
            reason: 'เข้าสู่ระบบสำเร็จ',
            httpStatus: 200,
            metadata: { userId: 1 },
        });

        expect(mockAccessLogRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                LOG_PROGRAM: 'LOGIN',
                LOG_USER: 'admin',
                LOG_IP: '203.0.113.195',
                LOG_USER_AGENT: 'Mozilla/5.0 TestBrowser',
                LOG_SESSION_ID: 'session-xyz',
                LOG_REQUEST_ID: 'req-12345',
                LOG_METHOD: 'POST',
                LOG_PATH: '/api/v1/auth/login',
                LOG_STATUS: 1,
                LOG_HTTP_STATUS: 200,
                LOG_HOST: 'scm.amec.co.th',
                LOG_METADATA: { userId: 1 },
            }),
        );
        expect(result).toBeDefined();
        expect(result?.LOG_ID).toBe(1);
    });

    it('should handle logging error gracefully without throwing exception', async () => {
        mockAccessLogRepository.save.mockRejectedValueOnce(
            new Error('Database connection failed'),
        );

        const result = await service.log({
            program: 'LOGIN',
            user: 'admin',
            status: 0,
            reason: 'DB Error',
        });

        expect(result).toBeNull();
    });
});
