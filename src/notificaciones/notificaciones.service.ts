import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from '../entities/notificacion.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private notificacionRepository: Repository<Notificacion>,
  ) {}

  findForUser(destinatarioUid: string, idEntidad?: number) {
    const where: { id_destinatario: string; id_entidad?: number } = {
      id_destinatario: destinatarioUid,
    };
    if (idEntidad != null) where.id_entidad = idEntidad;

    return this.notificacionRepository.find({
      where,
      order: { fecha_creacion: 'DESC' },
      take: 100,
    });
  }

  countUnread(destinatarioUid: string, idEntidad?: number) {
    const qb = this.notificacionRepository
      .createQueryBuilder('n')
      .where('n.id_destinatario = :uid', { uid: destinatarioUid })
      .andWhere('n.leida = false');

    if (idEntidad != null) {
      qb.andWhere('n.id_entidad = :idEntidad', { idEntidad });
    }

    return qb.getCount();
  }

  async createForMencion(params: {
    destinatarioUid: string;
    emisorUid: string;
    emailEmisor: string;
    idEntidad: number;
    idGestion: number;
    idPersona: number;
    personaNombre: string;
    accion: string;
    contacto: string;
    observaciones?: string;
  }) {
    const detalleObs = params.observaciones?.trim()
      ? ` Observaciones: ${params.observaciones.trim()}`
      : '';
    const mensaje = `${params.emailEmisor} te mencionó en una gestión de ${params.personaNombre}: ${params.accion} — ${params.contacto}.${detalleObs}`;

    return this.notificacionRepository.save({
      id_destinatario: params.destinatarioUid,
      id_emisor: params.emisorUid,
      email_emisor: params.emailEmisor,
      id_entidad: params.idEntidad,
      id_gestion: params.idGestion,
      id_persona: params.idPersona,
      persona_nombre: params.personaNombre,
      mensaje,
      leida: false,
    });
  }

  async markAsRead(id: number, destinatarioUid: string) {
    const notif = await this.notificacionRepository.findOne({
      where: { id, id_destinatario: destinatarioUid },
    });
    if (!notif) return null;
    notif.leida = true;
    return this.notificacionRepository.save(notif);
  }

  async markAllAsRead(destinatarioUid: string, idEntidad?: number) {
    const qb = this.notificacionRepository
      .createQueryBuilder()
      .update(Notificacion)
      .set({ leida: true })
      .where('id_destinatario = :uid', { uid: destinatarioUid })
      .andWhere('leida = false');

    if (idEntidad != null) {
      qb.andWhere('id_entidad = :idEntidad', { idEntidad });
    }

    await qb.execute();
    return { ok: true };
  }
}
