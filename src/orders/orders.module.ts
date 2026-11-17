import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';

import { OrdersDetail } from '../entities/table/orders_detail.js';
import { Orders } from '../entities/table/orders.entity.js';

@Module({
    imports: [TypeOrmModule.forFeature([Orders, OrdersDetail], 'dbConnection')],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
