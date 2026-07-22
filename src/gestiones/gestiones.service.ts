import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Gestion } from '../entities/gestion.entity';
import { Subject } from 'rxjs';

@Injectable()
export class GestionesService {
  private events$ = new Subject<{ idPersona: number }>();

  constructor(
    @InjectRepository(Gestion)
    private gestionRepository: Repository<Gestion>,
  ) {}

  getEvents() {
    return this.events$.asObservable();
  }

  async create(data: Partial<Gestion>) {
    const gestion = await this.gestionRepository.save(data);
    this.events$.next({ idPersona: gestion.idPersona });
    return gestion;
  }

  findAllByPersona(idPersona: number) {
    return this.gestionRepository.find({
      where: { idPersona },
      order: { fecha_hora: 'DESC' },
    });
  }

  findHistorial(opts: {
    entidadIds?: number[];
    gestor?: string;
    desde?: string;
    hasta?: string;
    limit: number;
  }) {
    const where: any = {};

    if (opts.gestor) {
      where.usuario = opts.gestor;
    }

    if (opts.entidadIds?.length) {
      where.persona = { idEntidad: In(opts.entidadIds) };
    }

    const parseDateInput = (raw: string | undefined, endOfDay: boolean) => {
      if (!raw) return null;
      const trimmed = raw.trim();
      // Si viene como YYYY-MM-DD, parsear como fecha LOCAL para evitar shifts por UTC
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        const dt = new Date(y, mo, d, 0, 0, 0, 0);
        if (endOfDay) dt.setHours(23, 59, 59, 999);
        return isNaN(dt.getTime()) ? null : dt;
      }

      const dt = new Date(trimmed);
      if (isNaN(dt.getTime())) return null;
      return dt;
    };

    const desdeDate = parseDateInput(opts.desde, false);
    const hastaDate = parseDateInput(opts.hasta, true);

    const hasDesde = !!desdeDate;
    const hasHasta = !!hastaDate;
    if (hasDesde && hasHasta) {
      where.fecha_hora = Between(desdeDate!, hastaDate!);
    } else if (hasDesde) {
      where.fecha_hora = MoreThanOrEqual(desdeDate!);
    } else if (hasHasta) {
      where.fecha_hora = LessThanOrEqual(hastaDate!);
    }

    return this.gestionRepository.find({
      where,
      relations: { persona: true },
      order: { fecha_hora: 'DESC' },
      take: opts.limit,
    });
  }
}
