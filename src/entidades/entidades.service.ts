import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entidad } from '../entities/entidad.entity';
import { Roles } from 'src/constantes';

@Injectable()
export class EntidadesService {
  constructor(
    @InjectRepository(Entidad)
    private entidadRepository: Repository<Entidad>,
  ) {}

  findAll(user: any): Promise<Entidad[]> {
    const isSysAdmin = user.roles?.includes(Roles.SYS_ADMIN);

    if (isSysAdmin) {
      return this.entidadRepository.find({
        where: { activo: true },
        order: { nombre: 'ASC' },
      });
    }

    const allowedIds = user.idEntidades || [];
    if (user.idEntidad && !allowedIds.includes(user.idEntidad)) {
      allowedIds.push(user.idEntidad);
    }

    if (allowedIds.length === 0) return Promise.resolve([]);

    return this.entidadRepository
      .createQueryBuilder('entidad')
      .where('entidad.id IN (:...ids)', { ids: allowedIds })
      .andWhere('entidad.activo = :activo', { activo: true })
      .orderBy('entidad.nombre', 'ASC')
      .getMany();
  }

  findOne(id: number): Promise<Entidad | null> {
    if (!id) return Promise.resolve(null);
    return this.entidadRepository.findOne({ where: { id } });
  }
}
