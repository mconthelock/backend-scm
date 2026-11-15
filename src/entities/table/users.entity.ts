import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    type Relation,
} from 'typeorm';
import { UsersPassword } from './users-password.entity.js';

@Entity({ name: 'USERS' })
export class Users {
    @PrimaryGeneratedColumn({ name: 'USR_ID', type: 'int' })
    USR_ID: number;

    @Column({ name: 'USR_LOGIN', type: 'varchar', length: 50, unique: true })
    USR_LOGIN: string;

    @Column({ name: 'USR_NAME', type: 'varchar', length: 150 })
    USR_NAME: string;

    @Column({ name: 'USR_EMAIL', type: 'varchar', length: 150 })
    USR_EMAIL: string;

    @Column({
        name: 'USR_REGISTDATE',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    USR_REGISTDATE: Date;

    @Column({ name: 'USR_RESETDATE', type: 'datetime', nullable: true })
    USR_RESETDATE: Date | null;

    @Column({ name: 'USR_PIC', type: 'int', nullable: true })
    USR_PIC: number | null;

    @Column({
        name: 'USR_PIC_EMAIL',
        type: 'varchar',
        length: 150,
        nullable: true,
    })
    USR_PIC_EMAIL: string | null;

    @Column({ name: 'USR_STATUS', type: 'tinyint', default: 1 })
    USR_STATUS: number;

    @Column({ name: 'GROUPS', type: 'int', default: 16 })
    GROUPS: number;

    @Column({ name: 'VENDORS', type: 'int', nullable: true })
    VENDORS: number | null;

    @Column({ name: 'PROD_ID', type: 'varchar', length: 50, nullable: true })
    PROD_ID: string | null;

    @Column({ name: 'USR_PDPA', type: 'tinyint', default: 0 })
    USR_PDPA: number;

    @Column({ name: 'USR_LASTLOGIN', type: 'datetime', nullable: true })
    USR_LASTLOGIN: Date | null;

    @Column({
        name: 'USR_LASTUPDATE',
        type: 'datetime',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    USR_LASTUPDATE: Date | null;

    @ManyToOne(() => Users, { nullable: true })
    @JoinColumn({ name: 'USR_PIC', referencedColumnName: 'USR_ID' })
    picUser?: Relation<Users> | null;

    @OneToOne(() => UsersPassword, (password) => password.user)
    password?: Relation<UsersPassword>;
}
