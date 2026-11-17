import {
    Column,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { AsnItem } from './asn-item.entity.js';

@Entity({ name: 'ADVANCE_SHIPPING_NOTICES' })
@Index('IDX_ASN_NO', ['ASN_NO'], { unique: true })
@Index('IDX_ASN_PO_ID', ['PO_ID'])
@Index('IDX_ASN_STATUS', ['STATUS'])
export class AdvanceShippingNotice {
    @PrimaryGeneratedColumn({ name: 'ASN_ID', type: 'int' })
    ASN_ID: number;

    @Column({ name: 'ASN_NO', type: 'varchar', length: 50, unique: true })
    ASN_NO: string;

    @Column({ name: 'PO_ID', type: 'int' })
    PO_ID: number;

    @Column({ name: 'BARCODE_TOKEN', type: 'varchar', length: 100 })
    BARCODE_TOKEN: string;

    @Column({ name: 'CARRIER_NAME', type: 'varchar', length: 100 })
    CARRIER_NAME: string;

    @Column({ name: 'TRUCK_PLATE_NO', type: 'varchar', length: 50 })
    TRUCK_PLATE_NO: string;

    @Column({ name: 'DRIVER_NAME', type: 'varchar', length: 100 })
    DRIVER_NAME: string;

    @Column({ name: 'DRIVER_PHONE', type: 'varchar', length: 50 })
    DRIVER_PHONE: string;

    @Column({ name: 'DISPATCH_TIME', type: 'datetime' })
    DISPATCH_TIME: Date;

    @Column({ name: 'ESTIMATED_ARRIVAL_TIME', type: 'datetime' })
    ESTIMATED_ARRIVAL_TIME: Date;

    @Column({ name: 'ACTUAL_ARRIVAL_TIME', type: 'datetime', nullable: true })
    ACTUAL_ARRIVAL_TIME: Date | null;

    @Column({
        name: 'RECEIVING_DOCK',
        type: 'varchar',
        length: 50,
        default: 'Gate B Dock',
    })
    RECEIVING_DOCK: string;

    @Column({ name: 'STATUS', type: 'varchar', length: 20, default: 'CREATED' })
    STATUS: string;

    @Column({ name: 'RECEIVE_TIME', type: 'datetime', nullable: true })
    RECEIVE_TIME: Date | null;

    @Column({
        name: 'CREATED_AT',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    CREATED_AT: Date;

    @OneToMany(() => AsnItem, (item) => item.asn, {
        cascade: true,
    })
    items?: Relation<AsnItem[]>;
}
