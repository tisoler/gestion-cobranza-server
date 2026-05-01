import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
