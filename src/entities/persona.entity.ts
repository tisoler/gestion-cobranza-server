import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TgiUrbano } from './tgi-urbano.entity';
import { TgiRural } from './tgi-rural.entity';
import { Patente } from './patente.entity';
import { Gestion } from './gestion.entity';

@Entity('personas')
export class Persona {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: 'tipo_doc' })
  tipoDoc: string;

  @Column({ nullable: true, name: 'nro_doc' })
  nroDoc: string;

  @Column({ nullable: true })
  cuit: string;

  @Column({ nullable: true, name: 'apellido_nombre' })
  apellidoNombre: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true, name: 'calle_domicilio' })
  calleDomicilio: string;

  @Column({ nullable: true, name: 'numero_domicilio' })
  numeroDomicilio: string;

  @Column({ nullable: true, name: 'piso_domicilio' })
  pisoDomicilio: string;

  @Column({ nullable: true, name: 'depto_domicilio' })
  deptoDomicilio: string;

  @Column({ nullable: true })
  localidad: string;

  @Column({ nullable: true })
  provincia: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  /** Orden: [actual (más reciente), … anteriores] */
  @Column({ type: 'jsonb', default: [], name: 'lista_telefonos' })
  listaTelefonos: string[];

  /** Orden: [actual (más reciente), … anteriores] */
  @Column({ type: 'jsonb', default: [], name: 'lista_emails' })
  listaEmails: string[];

  @Column({ nullable: true })
  idEntidad: number | null;

  @Column({ type: 'boolean', default: true })
  habilitado: boolean;

  @OneToMany(() => TgiUrbano, (tgi) => tgi.persona)
  tgiUrbanos: TgiUrbano[];

  @OneToMany(() => TgiRural, (tgi) => tgi.persona)
  tgiRurales: TgiRural[];

  @OneToMany(() => Patente, (patente) => patente.persona)
  patentes: Patente[];

  @OneToMany(() => Gestion, (gestion) => gestion.persona)
  gestiones: Gestion[];
}
