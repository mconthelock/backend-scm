import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { Vendors } from './vendors.entity.js';

@Entity({ name: 'VENDORS_ADDRESS' })
export class VendorsAddress {
    @PrimaryGeneratedColumn({ name: 'ADDR_ID', type: 'int', unsigned: true })
    ADDR_ID: number;

    @Column({ name: 'VENDOR_ID', type: 'int', unsigned: true })
    VENDOR_ID: number;

    @Column({
        name: 'ADDR_LINE1',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    ADDR_LINE1: string | null;

    @Column({
        name: 'ADDR_LINE2',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    ADDR_LINE2: string | null;

    @Column({
        name: 'ADDR_LINE3',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    ADDR_LINE3: string | null;

    @Column({ name: 'ADDR_CITY', type: 'varchar', length: 100, nullable: true })
    ADDR_CITY: string | null;

    @Column({ name: 'ADDR_COUNTRY', type: 'int', nullable: true })
    ADDR_COUNTRY: number | null;

    @Column({
        name: 'ADDR_ZIPCODE',
        type: 'varchar',
        length: 20,
        nullable: true,
    })
    ADDR_ZIPCODE: string | null;

    @Column({ name: 'ADDR_STATUS', type: 'tinyint', default: 1 })
    ADDR_STATUS: number;

    @ManyToOne(() => Vendors, (vendor) => vendor.addresses, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'VENDOR_ID', referencedColumnName: 'VND_ID' })
    vendor?: Relation<Vendors>;
}
