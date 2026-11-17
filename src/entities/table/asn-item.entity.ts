import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { AdvanceShippingNotice } from './advance-shipping-notice.entity.js';

@Entity({ name: 'ASN_ITEMS' })
@Index('IDX_ASN_ITEMS_ASN_NO', ['ASN_NO'])
@Index('IDX_ASN_ITEMS_PO_ITEM_ID', ['PO_ITEM_ID'])
export class AsnItem {
    @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
    ID: number;

    @Column({ name: 'ASN_NO', type: 'varchar', length: 50 })
    ASN_NO: string;

    @Column({ name: 'PO_ITEM_ID', type: 'int' })
    PO_ITEM_ID: number;

    @Column({ name: 'SHIPMENT_SCHEDULE_ID', type: 'int', nullable: true })
    SHIPMENT_SCHEDULE_ID: number | null;

    @Column({
        name: 'DISPATCH_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    DISPATCH_QTY: number;

    @Column({
        name: 'RECEIVED_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    RECEIVED_QTY: number;

    @Column({
        name: 'REJECTED_QTY',
        type: 'decimal',
        precision: 18,
        scale: 4,
        default: 0.0,
    })
    REJECTED_QTY: number;

    @Column({ name: 'LOT_BATCH_NO', type: 'varchar', length: 50, nullable: true })
    LOT_BATCH_NO: string | null;

    @Column({
        name: 'PACKAGE_CRATE_NO',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    PACKAGE_CRATE_NO: string | null;

    @Column({ name: 'QA_STATUS', type: 'varchar', length: 20, default: 'PENDING' })
    QA_STATUS: string;

    @Column({
        name: 'CREATED_AT',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    CREATED_AT: Date;

    @ManyToOne(() => AdvanceShippingNotice, (asn) => asn.items, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'ASN_NO', referencedColumnName: 'ASN_NO' })
    asn?: Relation<AdvanceShippingNotice>;
}
