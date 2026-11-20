import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { Orders } from './orders.entity.js';
import { OrdersShipmentSchedule } from './orders-shipment-schedule.entity.js';

@Entity({ name: 'ORDERS_DETAIL' })
@Index('IDX_ORDD_LINE', ['ORDD_LINE'])
@Index('IDX_ORDD_ITEM', ['ORDD_ITEM'])
@Index('IDX_ORDD_DRAWING', ['ORDD_DRAWING'])
@Index('IDX_ORDD_DUEDATE', ['ORDD_DUEDATE'])
export class OrdersDetail {
    @PrimaryGeneratedColumn({ name: 'ORDD_ID', type: 'int' })
    ORDD_ID: number;

    @Column({ name: 'ORDD_LINE', type: 'int' })
    ORDD_LINE: number;

    @Column({ name: 'ORDD_ITEM', type: 'varchar', length: 50, nullable: true })
    ORDD_ITEM: string | null;

    @Column({
        name: 'ORDD_ITEMCODE',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    ORDD_ITEMCODE: string | null;

    @Column({ name: 'ORDD_DESCRIPTION', type: 'varchar', length: 256 })
    ORDD_DESCRIPTION: string;

    @Column({
        name: 'ORDD_EXTRADESC',
        type: 'varchar',
        length: 256,
        nullable: true,
    })
    ORDD_EXTRADESC: string | null;

    @Column({
        name: 'ORDD_REFDESC',
        type: 'varchar',
        length: 256,
        nullable: true,
    })
    ORDD_REFDESC: string | null;

    @Column({
        name: 'ORDD_DRAWING',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    ORDD_DRAWING: string | null;

    @Column({ name: 'ORDD_BOI', type: 'varchar', length: 50, nullable: true })
    ORDD_BOI: string | null;

    @Column({
        name: 'ORDD_BOIDESC',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    ORDD_BOIDESC: string | null;

    @Column({
        name: 'ORDD_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    ORDD_QTY: number;

    @Column({ name: 'ORDD_UNIT', type: 'varchar', length: 20, default: 'PCS' })
    ORDD_UNIT: string;

    @Column({
        name: 'ORDD_PRICE',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    ORDD_PRICE: number;

    @Column({ name: 'ORDD_DUEDATE', type: 'datetime' })
    ORDD_DUEDATE: Date;

    @Column({ name: 'ORDD_RESPOND', type: 'datetime', nullable: true })
    ORDD_RESPOND: Date | null;

    @Column({ name: 'ORDD_RESPONDBY', type: 'int', nullable: true })
    ORDD_RESPONDBY: number | null;

    @Column({
        name: 'ORDD_SHIPPED_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    ORDD_SHIPPED_QTY: number;

    @Column({
        name: 'ORDD_RECEIVED_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    ORDD_RECEIVED_QTY: number;

    @Column({ name: 'ORDD_STATUS', type: 'int', default: 1 })
    ORDD_STATUS: number;

    @Column({ name: 'ORDD_CANCEL', type: 'tinyint', default: 0 })
    ORDD_CANCEL: number;

    @Column({ name: 'ORDD_BUYERCOMMENT', type: 'text', nullable: true })
    ORDD_BUYERCOMMENT: string | null;

    @Column({ name: 'ORDD_VENDORCOMMENT', type: 'text', nullable: true })
    ORDD_VENDORCOMMENT: string | null;

    @Column({ name: 'ORDERS_ID', type: 'int', nullable: true })
    ORDERS_ID: number | null;

    @ManyToOne(() => Orders, (order) => order.details, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'ORDERS_ID', referencedColumnName: 'ORD_ID' })
    order?: Relation<Orders>;

    @OneToMany(
        () => OrdersShipmentSchedule,
        (schedule) => schedule.orderDetail,
        {
            cascade: true,
        },
    )
    shipmentSchedules?: Relation<OrdersShipmentSchedule[]>;
}
