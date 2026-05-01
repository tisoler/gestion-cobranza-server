import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Persona } from '../entities/persona.entity';
import { AddContactoDto } from './dto/add-contacto.dto';

function normalizeLista(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private personaRepository: Repository<Persona>,
  ) {}

  async findAll(
    options: {
      idEntidad?: number;
      dni?: string;
      cuit?: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
      email?: string;
      numeroPadron?: string;
      codigoWeb?: string;
      patente?: string;
      sort?: string;
      page?: number;
      roles?: string[];
    } = {},
  ) {
    const {
      idEntidad,
      dni,
      cuit,
      nombre,
      apellido,
      telefono,
      email,
      numeroPadron,
      codigoWeb,
      patente,
      sort,
      page = 1,
      roles = [],
    } = options;
    const limit = 15;
    const skip = (page - 1) * limit;

    const query = this.personaRepository.createQueryBuilder('persona');

    // Expresión para Deuda Total (Suma de los 3 productos)
    const subqueryDeuda = `(
      COALESCE((SELECT SUM(c.capital + c.intereses) FROM cuotas_tgi_urbano c JOIN tgi_urbano t ON c."idTgiUrbano" = t.id WHERE t."idPersona" = persona.id), 0) +
      COALESCE((SELECT SUM(c.capital + c.intereses) FROM cuotas_tgi_rural c JOIN tgi_rural t ON c."idTgiRural" = t.id WHERE t."idPersona" = persona.id), 0) +
      COALESCE((SELECT SUM(c.capital + c.intereses) FROM cuotas_patentes c JOIN patentes t ON c."idPatente" = t.id WHERE t."idPersona" = persona.id), 0)
    )`;

    // Expresión para Cantidad de Cuotas
    const subqueryCuotas = `(
      COALESCE((SELECT COUNT(*) FROM cuotas_tgi_urbano c JOIN tgi_urbano t ON c."idTgiUrbano" = t.id WHERE t."idPersona" = persona.id), 0) +
      COALESCE((SELECT COUNT(*) FROM cuotas_tgi_rural c JOIN tgi_rural t ON c."idTgiRural" = t.id WHERE t."idPersona" = persona.id), 0) +
      COALESCE((SELECT COUNT(*) FROM cuotas_patentes c JOIN patentes t ON c."idPatente" = t.id WHERE t."idPersona" = persona.id), 0)
    )`;

    // Añadimos las métricas al SELECT
    query.addSelect(subqueryDeuda, 'deuda_total');
    query.addSelect(subqueryCuotas, 'cuotas_totales');

    // Último contacto (Subconsulta simple)
    query.addSelect((subQuery) => {
      return subQuery
        .select('MAX(g.fecha_hora)', 'max_fecha')
        .from('gestiones', 'g')
        .where('g.idPersona = persona.id');
    }, 'ultimo_contacto');

    if (idEntidad != null && Number.isFinite(idEntidad)) {
      query.andWhere('persona.idEntidad = :idEntidad', { idEntidad });
    }

    const isSysAdminOrAdmin = roles.includes('sys-admin') || roles.includes('admin');
    if (!isSysAdminOrAdmin) {
      query.andWhere('persona.habilitado = :habilitado', { habilitado: true });
    }

    // Filtros
    if (dni && dni.length >= 3) {
      query.andWhere('persona.dni ILIKE :dni', { dni: `%${dni}%` });
    }
    if (cuit && cuit.length >= 3) {
      query.andWhere('persona.cuit ILIKE :cuit', { cuit: `%${cuit}%` });
    }
    if (nombre && nombre.length >= 3) {
      query.andWhere('persona.nombre ILIKE :nombre', { nombre: `%${nombre}%` });
    }
    if (apellido && apellido.length >= 3) {
      query.andWhere('persona.apellido ILIKE :apellido', {
        apellido: `%${apellido}%`,
      });
    }
    if (telefono && telefono.length >= 3) {
      query.andWhere(
        `(persona.telefono ILIKE :telefono OR (COALESCE(persona.lista_telefonos, '[]'::jsonb))::text ILIKE :telefono)`,
        { telefono: `%${telefono}%` },
      );
    }
    if (email && email.length >= 3) {
      query.andWhere(
        `(persona.email ILIKE :email OR (COALESCE(persona.lista_emails, '[]'::jsonb))::text ILIKE :email)`,
        { email: `%${email}%` },
      );
    }
    if (numeroPadron && numeroPadron.length >= 3) {
      query.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM tgi_urbano tu
            WHERE tu."idPersona" = persona.id
              AND tu.numero_padron ILIKE :numeroPadron
          )
          OR EXISTS (
            SELECT 1 FROM tgi_rural tr
            WHERE tr."idPersona" = persona.id
              AND tr.numero_padron ILIKE :numeroPadron
          )
        )`,
        { numeroPadron: `%${numeroPadron}%` },
      );
    }
    if (codigoWeb && codigoWeb.length >= 3) {
      query.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM tgi_urbano tu
            WHERE tu."idPersona" = persona.id
              AND tu.codigo_web ILIKE :codigoWeb
          )
          OR EXISTS (
            SELECT 1 FROM tgi_rural tr
            WHERE tr."idPersona" = persona.id
              AND tr.codigo_web ILIKE :codigoWeb
          )
        )`,
        { codigoWeb: `%${codigoWeb}%` },
      );
    }
    if (patente && patente.length >= 3) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM patentes p
          WHERE p."idPersona" = persona.id
            AND p.numero_patente ILIKE :patente
        )`,
        { patente: `%${patente}%` },
      );
    }

    // Ordenamiento
    switch (sort) {
      case 'deudaDesc':
        query.orderBy('deuda_total', 'DESC');
        break;
      case 'cuotasDesc':
        query.orderBy('cuotas_totales', 'DESC');
        break;
      case 'contactoDesc':
        query.orderBy('ultimo_contacto', 'DESC', 'NULLS LAST');
        break;
      case 'contactoAsc':
        query.orderBy('ultimo_contacto', 'ASC', 'NULLS FIRST');
        break;
      default:
        query.orderBy('persona.apellido', 'ASC');
    }

    // Paginado
    query.skip(skip).take(limit);

    // Cargar relaciones necesarias
    query
      .leftJoinAndSelect('persona.tgiUrbanos', 'tgiUrbanos')
      .leftJoinAndSelect('tgiUrbanos.cuotas', 'cuotasUrbano')
      .leftJoinAndSelect('persona.tgiRurales', 'tgiRurales')
      .leftJoinAndSelect('tgiRurales.cuotas', 'cuotasRural')
      .leftJoinAndSelect('persona.patentes', 'patentes')
      .leftJoinAndSelect('patentes.cuotas', 'cuotasPatente')
      .leftJoinAndSelect('persona.gestiones', 'gestiones');

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  findOne(id: number, idEntidad?: number) {
    const where: FindOptionsWhere<Persona> = { id };
    if (idEntidad != null && Number.isFinite(idEntidad)) {
      where.idEntidad = idEntidad;
    }
    return this.personaRepository.findOne({
      where,
      relations: [
        'tgiUrbanos',
        'tgiUrbanos.cuotas',
        'tgiRurales',
        'tgiRurales.cuotas',
        'patentes',
        'patentes.cuotas',
        'gestiones',
      ],
    });
  }

  create(data: Partial<Persona>) {
    const listaT = data.telefono?.trim()
      ? [data.telefono.trim()]
      : normalizeLista(data.listaTelefonos);
    const listaE = data.email?.trim()
      ? [data.email.trim()]
      : normalizeLista(data.listaEmails);
    return this.personaRepository.save({
      ...data,
      listaTelefonos: listaT,
      listaEmails: listaE,
      telefono: listaT[0] ?? data.telefono ?? null,
      email: listaE[0] ?? data.email ?? null,
    });
  }

  async addContacto(
    id: number,
    idEntidad: number | undefined,
    dto: AddContactoDto,
  ) {
    const t = dto.telefono?.trim();
    const e = dto.email?.trim();
    if (!t && !e) {
      throw new BadRequestException(
        'Debe enviar al menos un teléfono o un email',
      );
    }
    const persona = await this.findOne(id, idEntidad);
    if (!persona) return null;

    let listaT = normalizeLista(persona.listaTelefonos);
    let listaE = normalizeLista(persona.listaEmails);
    if (listaT.length === 0 && persona.telefono?.trim()) {
      listaT = [persona.telefono.trim()];
    }
    if (listaE.length === 0 && persona.email?.trim()) {
      listaE = [persona.email.trim()];
    }

    if (t) {
      listaT = [t, ...listaT.filter((x) => x !== t)];
    }
    if (e) {
      const el = e.toLowerCase();
      listaE = [e, ...listaE.filter((x) => x.toLowerCase() !== el)];
    }

    persona.listaTelefonos = listaT;
    persona.listaEmails = listaE;
    persona.telefono = listaT[0] ?? null;
    persona.email = listaE[0] ?? null;
    await this.personaRepository.save(persona);
    return this.findOne(id, idEntidad);
  }

  async toggleHabilitado(id: number, idEntidad?: number) {
    const where: FindOptionsWhere<Persona> = { id };
    if (idEntidad != null && Number.isFinite(idEntidad)) {
      where.idEntidad = idEntidad;
    }

    const persona = await this.personaRepository.findOne({ 
      where, 
      select: ['id', 'habilitado'] 
    });
    
    if (!persona) return null;
    
    persona.habilitado = !persona.habilitado;
    await this.personaRepository.update(persona.id, { habilitado: persona.habilitado });
    return persona;
  }
}
