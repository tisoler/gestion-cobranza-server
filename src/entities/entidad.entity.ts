import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('entidades')
export class Entidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}
