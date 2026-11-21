import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AccessLog } from '../../entities/table/access-log.entity.js';

export interface CreateAccessLogParams {
    req?: Request | null;
    program: string;
    user: string;
    status: number; // 1 = Successful, 0 = Failure
    reason?: string | null;
    httpStatus?: number | null;
    metadata?: any | null;
    ip?: string | null;
    host?: string | null;
    sessionId?: string | null;
    userAgent?: string | null;
    method?: string | null;
    path?: string | null;
    requestId?: string | null;
}

@Injectable()
export class AccessLogService {
    private readonly logger = new Logger(AccessLogService.name);

    constructor(
        @InjectRepository(AccessLog, 'dbConnection')
        private readonly accessLogRepository: Repository<AccessLog>,
        private readonly configService: ConfigService,
    ) {}

    /**
     * บันทึกรายการลงตาราง ACCESS_LOG
     * ดึงข้อมูล IP, User-Agent, Method, Path, Session ID, Host จาก Request อัตโนมัติ
     * ปลอดภัยด้วย try-catch ไม่กระทบต่อการทำงานหลัก
     */
    async log(params: CreateAccessLogParams): Promise<AccessLog | null> {
        try {
            const req = params.req;
            const ip =
                params.ip ||
                (req ? this.extractClientIp(req) : '127.0.0.1');
            const userAgent =
                params.userAgent !== undefined
                    ? params.userAgent
                    : req
                      ? (req.headers['user-agent'] as string)
                      : null;
            const host =
                params.host !== undefined
                    ? params.host
                    : (req ? (req.headers['host'] as string) : null) ||
                      this.configService.get<string>('HOST') ||
                      null;
            const sessionId =
                params.sessionId !== undefined
                    ? params.sessionId
                    : req
                      ? (req.headers['x-session-id'] as string)
                      : null;
            const requestId =
                params.requestId !== undefined
                    ? params.requestId
                    : req
                      ? (req.headers['x-request-id'] as string)
                      : null;
            const method =
                params.method !== undefined
                    ? params.method
                    : req
                      ? req.method
                      : null;
            const path =
                params.path !== undefined
                    ? params.path
                    : req
                      ? req.originalUrl || req.url
                      : null;

            const isMssql = this.configService.get<string>('HOST') === 'AMEC';
            let metadata = params.metadata;
            if (metadata && typeof metadata === 'object' && isMssql) {
                try {
                    metadata = JSON.stringify(metadata);
                } catch {
                    metadata = null;
                }
            }

            const accessLog = this.accessLogRepository.create({
                LOG_HOST: host ? String(host).slice(0, 100) : null,
                LOG_PROGRAM: String(params.program).slice(0, 100),
                LOG_USER: String(params.user || 'ANONYMOUS').slice(0, 100),
                LOG_IP: String(ip).slice(0, 45),
                LOG_DATE: new Date(),
                LOG_STATUS: params.status,
                LOG_REASON: params.reason ? String(params.reason).slice(0, 500) : null,
                LOG_SESSION_ID: sessionId ? String(sessionId).slice(0, 100) : null,
                LOG_USER_AGENT: userAgent ? String(userAgent).slice(0, 500) : null,
                LOG_METHOD: method ? String(method).slice(0, 10) : null,
                LOG_PATH: path ? String(path).slice(0, 255) : null,
                LOG_HTTP_STATUS: params.httpStatus ?? null,
                LOG_REQUEST_ID: requestId ? String(requestId).slice(0, 64) : null,
                LOG_METADATA: metadata ?? null,
            });

            return await this.accessLogRepository.save(accessLog);
        } catch (error) {
            this.logger.error(
                `Failed to write access log for ${params.program} (${params.user}): ${(error as Error).message}`,
                (error as Error).stack,
            );
            return null;
        }
    }

    private extractClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
            return ips[0].trim();
        }
        return req.ip || req.socket?.remoteAddress || '127.0.0.1';
    }
}
