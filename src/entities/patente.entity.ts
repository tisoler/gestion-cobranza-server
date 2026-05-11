import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Persona } from './persona.entity';
import { CuotaPatente } from './cuota-patente.entity';

@Entity('patentes')
export class Patente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idPersona: number;

  @ManyToOne(() => Persona, (persona) => persona.patentes)
  @JoinColumn({ name: 'idPersona' })
  persona: Persona;

  @Column()
  domicilio: string;

  @Column()
  numero_patente: string;

  @Column({ nullable: true })
  marca: string;

  @Column({ nullable: true })
  modelo: string;

  @Column({ nullable: true, name: 'marca_modelo' })
  marcaModelo: string;

  @Column()
  tipo: string;

  @Column({ nullable: true })
  tramo: string;

  @OneToMany(() => CuotaPatente, (cuota) => cuota.patente)
  cuotas: CuotaPatente[];
}
