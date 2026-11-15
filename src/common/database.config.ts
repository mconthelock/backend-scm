import * as dotenv from 'dotenv';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TypeOrmWinstonLogger } from './logger/typeorm-winston.logger.js';
dotenv.config();

let dbConnection: TypeOrmModuleAsyncOptions;
if (process.env.HOST == 'AMEC') {
    dbConnection = {
        name: 'dbConnection',
        imports: [ConfigModule],
        inject: [ConfigService, WINSTON_MODULE_PROVIDER],
        useFactory: async (config: ConfigService, winstonLogger: Logger) => ({
            type: 'mssql',
            host: process.env.DB_HOST,
            port: 1433,
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            autoLoadEntities: true,
            synchronize: false,
            logger: new TypeOrmWinstonLogger(winstonLogger),
            retryAttempts: 5,
            retryDelay: 2000,
        }),
    };
} else {
    dbConnection = {
        name: 'dbConnection',
        imports: [ConfigModule],
        inject: [ConfigService, WINSTON_MODULE_PROVIDER],
        useFactory: async (config: ConfigService, winstonLogger: Logger) => ({
            type: 'mysql',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT as string, 10),
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            autoLoadEntities: true,
            synchronize: false,
            logger: new TypeOrmWinstonLogger(winstonLogger),
        }),
    };
}

export default dbConnection;
