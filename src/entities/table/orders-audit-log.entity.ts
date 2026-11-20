import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PO_AUDIT_LOGS' })
@Index('IDX_AUDIT_PO_ID', ['PO_ID'])
@Index('IDX_AUDIT_CREATED_AT', ['CREATED_AT'])
export class OrdersAuditLog {
    @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
    ID: number;

    @Column({ name: 'PO_ID', type: 'int' })
    PO_ID: number;

    @Column({ name: 'WORKFLOW_EVENT', type: 'varchar', length: 150 })
    WORKFLOW_EVENT: string;

    @Column({ name: 'ACTION_CODE', type: 'varchar', length: 50 })
    ACTION_CODE: string;

    @Column({ name: 'ACTOR_NAME', type: 'varchar', length: 150 })
    ACTOR_NAME: string;

    @Column({ name: 'ACTOR_ORG', type: 'varchar', length: 150, nullable: true })
    ACTOR_ORG: string | null;

    @Column({ name: 'IP_ADDRESS', type: 'varchar', length: 50 })
    IP_ADDRESS: string;

    @Column({
        name: 'SESSION_ID',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    SESSION_ID: string | null;

    @Column({ name: 'DETAILS', type: 'text', nullable: true })
    DETAILS: string | null;

    @Column({ name: 'STATUS', type: 'varchar', length: 50, nullable: true })
    STATUS: string | null;

    @Column({ name: 'HASH', type: 'varchar', length: 128, nullable: true })
    HASH: string | null;

    @Column({
        name: 'CREATED_AT',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    CREATED_AT: Date;
}
