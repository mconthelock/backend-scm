import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { OrdersDetail } from './orders_detail.js';

@Entity({ name: 'ORDERS_SHIPMENT_SCHEDULE' })
@Index('IDX_SCHED_PO_ITEM', ['PO_ITEM_ID'])
@Index('IDX_SCHED_STATUS', ['STATUS'])
@Index('IDX_SCHED_ASN_NO', ['ASN_NO'])
export class OrdersShipmentSchedule {
    @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
    ID: number;

    @Column({ name: 'PO_ITEM_ID', type: 'int' })
    PO_ITEM_ID: number;

    @Column({ name: 'SPLIT_SEQ', type: 'int', default: 1 })
    SPLIT_SEQ: number;

    @Column({
        name: 'SCHEDULED_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    SCHEDULED_QTY: number;

    @Column({ name: 'PROMISED_SHIP_DATE', type: 'date' })
    PROMISED_SHIP_DATE: string;

    @Column({ name: 'ESTIMATED_ARRIVAL_DATE', type: 'date' })
    ESTIMATED_ARRIVAL_DATE: string;

    @Column({
        name: 'VENDOR_REMARKS',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    VENDOR_REMARKS: string | null;

    @Column({
        name: 'STATUS',
        type: 'varchar',
        length: 20,
        default: 'SCHEDULED',
    })
    STATUS: string;

    @Column({ name: 'ASN_NO', type: 'varchar', length: 50, nullable: true })
    ASN_NO: string | null;

    @Column({
        name: 'CREATED_AT',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    CREATED_AT: Date;

    @Column({
        name: 'UPDATED_AT',
        type: 'datetime',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    UPDATED_AT: Date | null;

    @ManyToOne(() => OrdersDetail, (detail) => detail.shipmentSchedules, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'PO_ITEM_ID', referencedColumnName: 'ORDD_ID' })
    orderDetail?: Relation<OrdersDetail>;
}
