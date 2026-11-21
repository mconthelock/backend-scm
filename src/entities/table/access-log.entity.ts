import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'ACCESS_LOG' })
export class AccessLog {
    @PrimaryGeneratedColumn({ name: 'LOG_ID', type: 'bigint' })
    LOG_ID: number;

    @Column({ name: 'LOG_HOST', type: 'varchar', length: 100, nullable: true })
    LOG_HOST: string | null;

    @Column({ name: 'LOG_PROGRAM', type: 'varchar', length: 100 })
    LOG_PROGRAM: string;

    @Column({ name: 'LOG_USER', type: 'varchar', length: 100 })
    LOG_USER: string;

    @Column({ name: 'LOG_IP', type: 'varchar', length: 45 })
    LOG_IP: string;

    @CreateDateColumn({ name: 'LOG_DATE', type: 'datetime' })
    LOG_DATE: Date;

    @Column({ name: 'LOG_STATUS', type: 'tinyint' })
    LOG_STATUS: number;

    @Column({
        name: 'LOG_REASON',
        type: 'varchar',
        length: 500,
        nullable: true,
    })
    LOG_REASON: string | null;

    @Column({
        name: 'LOG_SESSION_ID',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    LOG_SESSION_ID: string | null;

    @Column({
        name: 'LOG_USER_AGENT',
        type: 'varchar',
        length: 500,
        nullable: true,
    })
    LOG_USER_AGENT: string | null;

    @Column({
        name: 'LOG_METHOD',
        type: 'varchar',
        length: 10,
        nullable: true,
    })
    LOG_METHOD: string | null;

    @Column({ name: 'LOG_PATH', type: 'varchar', length: 255, nullable: true })
    LOG_PATH: string | null;

    @Column({ name: 'LOG_HTTP_STATUS', type: 'smallint', nullable: true })
    LOG_HTTP_STATUS: number | null;

    @Column({
        name: 'LOG_REQUEST_ID',
        type: 'varchar',
        length: 64,
        nullable: true,
    })
    LOG_REQUEST_ID: string | null;

    @Column({
        name: 'LOG_METADATA',
        type: process.env.HOST === 'AMEC' ? 'nvarchar' : 'json',
        length: process.env.HOST === 'AMEC' ? 1000 : undefined,
        nullable: true,
    })
    LOG_METADATA: any | null;
}
