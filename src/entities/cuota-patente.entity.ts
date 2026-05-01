import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Patente } from './patente.entity';

@Entity('cuotas_patentes')
export class CuotaPatente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idPatente: number;

  @ManyToOne(() => Patente, (patente) => patente.cuotas)
  @JoinColumn({ name: 'idPatente' })
  patente: Patente;

  @Column()
  numero_cuota: number;

  @Column()
  cantidad_cuotas: number;

  @Column('double precision')
  capital: number;

  @Column('double precision')
  intereses: number;

  @Column('date')
  vencimiento: Date;
}
