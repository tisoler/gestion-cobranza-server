import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { PlanPago } from '../entities/plan-pago.entity';
import { CreatePlanPagoDto } from './dto/create-plan-pago.dto';

@Injectable()
export class PlanesPagoService {
  constructor(
    @InjectRepository(PlanPago)
    private planPagoRepository: Repository<PlanPago>,
  ) {}

  findAll(options: {
    producto?: string;
    idEntidad?: number;
    roles?: string[];
  }) {
    const { producto, idEntidad, roles = [] } = options;
    const isSysAdmin = roles.includes('sys-admin');
    const isAdmin = roles.includes('admin');

    const where: FindOptionsWhere<PlanPago> = {};
    if (producto) where.producto = producto;

    // Strict entity filtering: if not sys-admin, MUST have an idEntidad
    if (!isSysAdmin) {
      if (!idEntidad) return []; // Access denied if no entity context
      where.idEntidad = idEntidad;
      if (!isAdmin) where.activo = true; // Gestores only see active
    }

    return this.planPagoRepository.find({ where });
  }

  create(dto: CreatePlanPagoDto) {
    return this.planPagoRepository.save(dto);
  }

  async toggleActivo(id: number, idEntidad?: number, roles: string[] = []) {
    const isSysAdmin = roles.includes('sys-admin');
    const where: FindOptionsWhere<PlanPago> = { id };

    if (!isSysAdmin && idEntidad) {
      where.idEntidad = idEntidad;
    }

    const plan = await this.planPagoRepository.findOne({ where });
    if (!plan) return null;
    plan.activo = !plan.activo;
    return this.planPagoRepository.save(plan);
  }

  async update(id: number, dto: any, idEntidad?: number, roles: string[] = []) {
    const isSysAdmin = roles.includes('sys-admin');
    const where: FindOptionsWhere<PlanPago> = { id };

    if (!isSysAdmin && idEntidad) {
      where.idEntidad = idEntidad;
    }

    const plan = await this.planPagoRepository.findOne({ where });
    if (!plan) return null;

    // Safety: don't allow changing entity unless sys-admin
    if (!isSysAdmin) {
      delete dto.idEntidad;
    }

    Object.assign(plan, dto);
    return this.planPagoRepository.save(plan);
  }
}
