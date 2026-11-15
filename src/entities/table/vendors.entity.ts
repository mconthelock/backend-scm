import {
    Column,
    Entity,
    OneToMany,
    PrimaryColumn,
    type Relation,
} from 'typeorm';
import { VendorsAddress } from './vendors-address.entity.js';

@Entity({ name: 'VENDORS' })
export class Vendors {
    @PrimaryColumn({ name: 'VND_CODE', type: 'varchar', length: 6 })
    VND_CODE: string;

    @Column({ name: 'VND_NAME', type: 'varchar', length: 150 })
    VND_NAME: string;

    @Column({
        name: 'VND_LONGNAME',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    VND_LONGNAME: string | null;

    @Column({ name: 'VND_TYPE', type: 'varchar', length: 50, nullable: true })
    VND_TYPE: string | null;

    @Column({ name: 'VND_STATUS', type: 'tinyint', default: 1 })
    VND_STATUS: number;

    @Column({
        name: 'VND_REGDATE',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    VND_REGDATE: Date;

    @Column({
        name: 'VND_LASTUPDATE',
        type: 'datetime',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    VND_LASTUPDATE: Date | null;

    @Column({
        name: 'VND_USERUPDATE',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    VND_USERUPDATE: string | null;

    @OneToMany(() => VendorsAddress, (address) => address.vendor, {
        cascade: true,
    })
    addresses?: Relation<VendorsAddress[]>;
}
