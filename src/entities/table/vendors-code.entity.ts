import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { Vendors } from './vendors.entity.js';

@Entity({ name: 'VENDORS_CODE' })
export class VendorsCode {
    @PrimaryGeneratedColumn({ name: 'CODE_ID', type: 'int', unsigned: true })
    CODE_ID: number;

    @Column({ name: 'CODE_NUM', type: 'varchar', length: 50, unique: true })
    CODE_NUM: string;

    @Column({ name: 'VENDOR_ID', type: 'int', unsigned: true })
    VENDOR_ID: number;

    @Column({ name: 'CODE_STATUS', type: 'tinyint', default: 1 })
    CODE_STATUS: number;

    @Column({
        name: 'CODE_REGDATE',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    CODE_REGDATE: Date;

    @ManyToOne(() => Vendors, (vendor) => vendor.codes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'VENDOR_ID', referencedColumnName: 'VND_ID' })
    vendor?: Relation<Vendors>;
}
