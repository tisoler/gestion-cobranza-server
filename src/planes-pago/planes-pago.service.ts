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

    if (!isSysAdmin) {
      if (idEntidad) {
        where.idEntidad = IsNull() ? IsNull() : idEntidad; 
        // Note: The logic for "this entity or global" depends on OR in typeorm
        // Since we need "idEntidad = X OR idEntidad IS NULL", we'll use an array of objects for OR
        const conditions = [];
        if (producto) {
           conditions.push({ producto, idEntidad });
           conditions.push({ producto, idEntidad: IsNull() });
        } else {
           conditions.push({ idEntidad });
           conditions.push({ idEntidad: IsNull() });
        }
        
        // If they are not admin/sysadmin, they should only see active planes
        if (!isAdmin) {
          conditions.forEach(c => c.activo = true);
        }
        
        return this.planPagoRepository.find({ where: conditions });
      } else {
        // If no entity context and not sys-admin, only global
        where.idEntidad = IsNull();
        if (!isAdmin) where.activo = true;
      }
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
