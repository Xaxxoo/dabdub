import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_VERIFY = 'email_verify',
  SUSPEND = 'suspend',
  REINSTATE = 'reinstate',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  EXPORT = 'export',
  IMPORT = 'import',
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  actorEmail: string;

  @Column({ nullable: true })
  actorUsername: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  resource: string; // e.g. "user", "organization", "project"

  @Column({ nullable: true })
  resourceId: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown>; // snapshot before change

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown>; // snapshot after change

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown>; // field-level diff

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  requestId: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ default: false })
  isSensitive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
