import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Persona } from './persona.entity';
import { CuotaTgiUrbano } from './cuota-tgi-urbano.entity';

@Entity('tgi_urbano')
export class TgiUrbano {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idPersona: number;

  @ManyToOne(() => Persona, (persona) => persona.tgiUrbanos)
  @JoinColumn({ name: 'idPersona' })
  persona: Persona;

  @Column()
  domicilio: string;

  @Column()
  numero_padron: string;

  @Column()
  codigo_web: string;

  @Column('float')
  sup_terreno: number;

  @Column('float')
  mts_frente: number;

  @Column({ nullable: true })
  manzana: string;

  @OneToMany(() => CuotaTgiUrbano, (cuota) => cuota.tgiUrbano)
  cuotas: CuotaTgiUrbano[];
}
