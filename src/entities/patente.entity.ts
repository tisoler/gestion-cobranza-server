import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
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

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column()
  tipo: string;

  @OneToMany(() => CuotaPatente, (cuota) => cuota.patente)
  cuotas: CuotaPatente[];
}
