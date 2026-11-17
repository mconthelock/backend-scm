import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrdersRepository } from './orders.repository.js';
import { Orders } from '../entities/table/orders.entity.js';
import { OrdersDetail } from '../entities/table/orders_detail.js';
import { OrdersShipmentSchedule } from '../entities/table/orders-shipment-schedule.entity.js';
import { AdvanceShippingNotice } from '../entities/table/advance-shipping-notice.entity.js';
import { AsnItem } from '../entities/table/asn-item.entity.js';
import { OrdersAuditLog } from '../entities/table/orders-audit-log.entity.js';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                Orders,
                OrdersDetail,
                OrdersShipmentSchedule,
                AdvanceShippingNotice,
                AsnItem,
                OrdersAuditLog,
            ],
            'dbConnection',
        ),
    ],
    controllers: [OrdersController],
    providers: [OrdersService, OrdersRepository],
    exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
