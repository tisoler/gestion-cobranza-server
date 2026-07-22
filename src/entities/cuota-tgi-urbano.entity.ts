import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TgiUrbano } from './tgi-urbano.entity';

@Entity('cuotas_tgi_urbano')
export class CuotaTgiUrbano {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idTgiUrbano: number;

  @ManyToOne(() => TgiUrbano, (tgi) => tgi.cuotas)
  @JoinColumn({ name: 'idTgiUrbano' })
  tgiUrbano: TgiUrbano;

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

  @Column({ nullable: true })
  tramo: string;
}
