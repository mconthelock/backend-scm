import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VENDORS_GROUP' })
export class VendorsGroup {
    @PrimaryGeneratedColumn({ name: 'CODE_ID', type: 'int', unsigned: true })
    CODE_ID: number;

    @Column({ name: 'CODE_NUM', type: 'varchar', length: 50, unique: true })
    CODE_NUM: string;

    @Column({ name: 'VENDOR_GROUP', type: 'int' })
    VENDOR_GROUP: number;

    @Column({ name: 'CODE_STATUS', type: 'tinyint', default: 1 })
    CODE_STATUS: number;

    @Column({
        name: 'CODE_REGDATE',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    CODE_REGDATE: Date;
}
