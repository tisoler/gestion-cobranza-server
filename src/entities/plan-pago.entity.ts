import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('planes_pago')
export class PlanPago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  /**
   * Producto al que aplica: 'tgi_urbano', 'tgi_rural', 'patente'
   */
  @Column()
  producto: string;

  @Column({ name: 'numero_cuotas' })
  numeroCuotas: number;

  @Column({ nullable: true, name: 'id_entidad' })
  idEntidad: number | null;

  @Column({ type: 'double precision', name: 'descuento_intereses' })
  descuentoIntereses: number;

  @Column({ type: 'double precision', name: 'porcentaje_anticipo' })
  porcentajeAnticipo: number;

  @Column({ default: true })
  activo: boolean;
}
