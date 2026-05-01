import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TgiRural } from './tgi-rural.entity';

@Entity('cuotas_tgi_rural')
export class CuotaTgiRural {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idTgiRural: number;

  @ManyToOne(() => TgiRural, (tgi) => tgi.cuotas)
  @JoinColumn({ name: 'idTgiRural' })
  tgiRural: TgiRural;

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
