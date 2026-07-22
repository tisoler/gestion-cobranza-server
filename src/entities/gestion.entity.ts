import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Persona } from './persona.entity';

@Entity('gestiones')
export class Gestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idPersona: number;

  @ManyToOne(() => Persona, (persona) => persona.gestiones)
  @JoinColumn({ name: 'idPersona' })
  persona: Persona;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_hora: Date;

  @Column()
  accion: string;

  @Column()
  contacto: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ nullable: true })
  usuario: string;

  @Column({ nullable: true })
  mencionado_uid: string;

  /** JSON array de UIDs Firebase mencionados */
  @Column({ type: 'text', nullable: true })
  mencionados_uids: string;
}
