import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  id_destinatario: string;

  @Column()
  id_emisor: string;

  @Column({ nullable: true })
  email_emisor: string;

  @Column()
  id_entidad: number;

  @Column({ nullable: true })
  id_gestion: number;

  @Column()
  id_persona: number;

  @Column({ nullable: true })
  persona_nombre: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_creacion: Date;
}
