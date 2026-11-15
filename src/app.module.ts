import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { TypeOrmModule } from '@nestjs/typeorm';
import { winstonConfig } from './common/logger/winston.config.js';
import dbConfig from './common/database.config.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { TransactionInterceptor } from './common/helpers/transaction.interceptor.js';

import { AuthModule } from './auth/auth.module.js';
import { VendorsModule } from './vendors/vendors.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        WinstonModule.forRoot(winstonConfig),
        TypeOrmModule.forRootAsync(dbConfig),
        AuthModule,
        VendorsModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransactionInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply().forRoutes('*');
    }
}
