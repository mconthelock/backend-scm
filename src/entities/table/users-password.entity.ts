import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
    type Relation,
} from 'typeorm';
import { Users } from './users.entity.js';

@Entity({ name: 'USERS_PASSWORD' })
export class UsersPassword {
    @PrimaryColumn({ name: 'USERS', type: 'int' })
    USERS: number;

    @Column({ name: 'PWD_CURRENT', type: 'varchar', length: 128 })
    PWD_CURRENT: string;

    @Column({
        name: 'PWD_PREVIOUS',
        type: 'varchar',
        length: 128,
        nullable: true,
    })
    PWD_PREVIOUS: string | null;

    @Column({
        name: 'PWD_UPDATEDATE',
        type: 'datetime',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP',
    })
    PWD_UPDATEDATE: Date | null;

    @OneToOne(() => Users, (user) => user.password, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'USERS', referencedColumnName: 'USR_ID' })
    user?: Relation<Users>;
}
