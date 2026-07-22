import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Persona } from './persona.entity';
import { CuotaTgiRural } from './cuota-tgi-rural.entity';

@Entity('tgi_rural')
export class TgiRural {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idPersona: number;

  @ManyToOne(() => Persona, (persona) => persona.tgiRurales)
  @JoinColumn({ name: 'idPersona' })
  persona: Persona;

  @Column()
  domicilio: string;

  @Column()
  numero_padron: string;

  @Column()
  codigo_web: string;

  @Column({ nullable: true })
  manzana: string;

  @Column('float', { nullable: true })
  sup_hectarea: number;

  @OneToMany(() => CuotaTgiRural, (cuota) => cuota.tgiRural)
  cuotas: CuotaTgiRural[];
}
