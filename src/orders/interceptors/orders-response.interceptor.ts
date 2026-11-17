import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';

export interface StandardResponse<T = any> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
    pagination?: any;
    timestamp: string;
}

@Injectable()
export class OrdersResponseInterceptor<T>
    implements NestInterceptor<T, StandardResponse<T> | T>
{
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpCtx = context.switchToHttp();
        const response = httpCtx.getResponse<Response>();

        return next.handle().pipe(
            map((val) => {
                // ข้ามการครอบ JSON envelope สำหรับ stream, buffer หรือ download files (เช่น CSV, PDF)
                const contentType = response.getHeader('Content-Type') as string;
                if (
                    Buffer.isBuffer(val) ||
                    (contentType &&
                        (contentType.includes('text/csv') ||
                            contentType.includes('application/pdf') ||
                            contentType.includes('application/octet-stream')))
                ) {
                    return val;
                }

                // กรณีมี pagination แยกออกมาจาก data
                if (val && typeof val === 'object' && 'data' in val && 'pagination' in val) {
                    return {
                        success: true,
                        statusCode: response.statusCode || 200,
                        message: 'Operation successful',
                        data: val.data,
                        pagination: val.pagination,
                        timestamp: new Date().toISOString(),
                    };
                }

                return {
                    success: true,
                    statusCode: response.statusCode || 200,
                    message: 'Operation successful',
                    data: val ?? {},
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
