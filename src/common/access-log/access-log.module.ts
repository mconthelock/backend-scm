import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessLog } from '../../entities/table/access-log.entity.js';
import { AccessLogService } from './access-log.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([AccessLog], 'dbConnection')],
    providers: [AccessLogService],
    exports: [AccessLogService],
})
export class AccessLogModule {}
