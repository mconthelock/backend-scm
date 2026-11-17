import {
    Column,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { OrdersDetail } from './orders_detail.js';

@Entity({ name: 'ORDERS' })
@Index(['ORD_PONO', 'ORD_DOCREV'], { unique: true })
@Index('IDX_ORDERS_PONO', ['ORD_PONO'])
@Index('IDX_ORDERS_VENDOR', ['VENDOR'])
@Index('IDX_ORDERS_STATUS', ['ORD_STATUS'])
@Index('IDX_ORDERS_PODATE', ['ORD_PODATE'])
export class Orders {
    @PrimaryGeneratedColumn({ name: 'ORD_ID', type: 'int' })
    ORD_ID: number;

    @Column({ name: 'ORD_PONO', type: 'varchar', length: 32 })
    ORD_PONO: string;

    @Column({ name: 'ORD_REVISION', type: 'int', default: 0 })
    ORD_REVISION: number;

    @Column({ name: 'ORD_DOCREV', type: 'int', default: 1 })
    ORD_DOCREV: number;

    @Column({ name: 'ORD_TYPE', type: 'int', default: 1 })
    ORD_TYPE: number;

    @Column({ name: 'ORD_PODATE', type: 'datetime' })
    ORD_PODATE: Date;

    @Column({ name: 'ORD_REFNO', type: 'varchar', length: 50, nullable: true })
    ORD_REFNO: string | null;

    @Column({
        name: 'ORD_SHIPTO',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    ORD_SHIPTO: string | null;

    @Column({ name: 'ORD_SHIPBY', type: 'varchar', length: 50, nullable: true })
    ORD_SHIPBY: string | null;

    @Column({
        name: 'ORD_CURRENCY',
        type: 'varchar',
        length: 10,
        default: 'THB',
    })
    ORD_CURRENCY: string;

    @Column({
        name: 'ORD_PAYMENT',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    ORD_PAYMENT: string | null;

    @Column({ name: 'ORD_TRADE', type: 'varchar', length: 50, nullable: true })
    ORD_TRADE: string | null;

    @Column({ name: 'VENDORCODE', type: 'varchar', length: 20 })
    VENDORCODE: string;

    @Column({ name: 'VENDOR', type: 'int' })
    VENDOR: number;

    @Column({ name: 'ADDR', type: 'int', nullable: true })
    ADDR: number | null;

    @Column({
        name: 'BUYERCODE',
        type: 'varchar',
        length: 20,
        nullable: true,
    })
    BUYERCODE: string | null;

    @Column({ name: 'BUYER', type: 'varchar', length: 20, nullable: true })
    BUYER: string | null;

    @Column({
        name: 'ORD_AMOUNT',
        type: 'decimal',
        precision: 18,
        scale: 4,
        nullable: true,
        default: 0.0,
    })
    ORD_AMOUNT: number | null;

    @Column({ name: 'ORD_STATUS', type: 'int', default: 1 })
    ORD_STATUS: number;

    @Column({ name: 'ORD_BUYERCOMMENT', type: 'text', nullable: true })
    ORD_BUYERCOMMENT: string | null;

    @Column({ name: 'ORD_VENDORCOMMENT', type: 'text', nullable: true })
    ORD_VENDORCOMMENT: string | null;

    @Column({ name: 'ORD_CLOSED', type: 'tinyint', default: 0 })
    ORD_CLOSED: number;

    @Column({ name: 'ORD_LATEST', type: 'tinyint', default: 1 })
    ORD_LATEST: number;

    @Column({
        name: 'ORD_LASTUPDATE',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    ORD_LASTUPDATE: Date;

    @Column({ name: 'FIRST_READ_AT', type: 'datetime', nullable: true })
    FIRST_READ_AT: Date | null;

    @Column({ name: 'FIRST_READ_BY', type: 'int', nullable: true })
    FIRST_READ_BY: number | null;

    @Column({ name: 'ACKNOWLEDGED_AT', type: 'datetime', nullable: true })
    ACKNOWLEDGED_AT: Date | null;

    @Column({ name: 'ACKNOWLEDGED_BY', type: 'int', nullable: true })
    ACKNOWLEDGED_BY: number | null;

    @OneToMany(() => OrdersDetail, (detail) => detail.order, {
        cascade: true,
    })
    details?: Relation<OrdersDetail[]>;
}
