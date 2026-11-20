import { HttpStatus } from '@nestjs/common';

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface StandardResponse<T = unknown> {
    success: true;
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends StandardResponse<T[]> {
    pagination: PaginationMeta;
}

/**
 * สร้าง Standard JSON Response Envelope สำหรับใช้ร่วมกันทุก Module
 */
export function successResponse<T>(
    data: T,
    message = 'Operation successful',
    statusCode: number = HttpStatus.OK,
): StandardResponse<T> {
    return {
        success: true,
        statusCode,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
}

/**
 * สร้าง Standard JSON Response Envelope พร้อมข้อมูล Pagination
 */
export function paginatedResponse<T>(
    data: T[],
    pagination: PaginationMeta,
    message = 'Operation successful',
    statusCode: number = HttpStatus.OK,
): PaginatedResponse<T> {
    return {
        success: true,
        statusCode,
        message,
        data,
        pagination,
        timestamp: new Date().toISOString(),
    };
}
