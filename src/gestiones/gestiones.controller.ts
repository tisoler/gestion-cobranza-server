import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Sse,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GestionesService } from './gestiones.service';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateGestionDto } from './dto/create-gestion.dto';
import { map } from 'rxjs';
import type { UserGestionCobranza } from '../auth/strategies/firebase.strategy';
import { Persona } from '../entities/persona.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Roles } from 'src/constantes';

@ApiTags('Gestiones')
@ApiBearerAuth()
@Controller('gestiones')
@UseGuards(FirebaseGuard, PermissionsGuard)
export class GestionesController {
  constructor(
    private readonly gestionesService: GestionesService,
    private readonly notificacionesService: NotificacionesService,
    private readonly usuariosService: UsuariosService,
    @InjectRepository(Persona)
    private personaRepository: Repository<Persona>,
  ) { }

  @Post()
  @Permissions('escritura:gestion')
  @ApiOperation({ summary: 'Crear una nueva gestión' })
  @ApiResponse({ status: 201, description: 'Gestión creada correctamente.' })
  async create(
    @Req() req: { user?: UserGestionCobranza },
    @Body() createGestionDto: CreateGestionDto,
  ) {
    const user = req.user;
    if (!user) {
      throw new BadRequestException('Usuario no autenticado');
    }
    const idEntidad = user.idEntidad;
    if (!idEntidad) {
      throw new BadRequestException('Entidad no definida para el usuario');
    }

    const { mencionadoUid, mencionadosUids, ...gestionData } = createGestionDto;

    const uidsMencionados = [
      ...new Set(
        [
          ...(mencionadosUids ?? []),
          ...(mencionadoUid ? [mencionadoUid] : []),
        ].filter(Boolean),
      ),
    ];

    for (const uid of uidsMencionados) {
      if (uid === user.id) {
        throw new BadRequestException('No puede mencionarse a sí mismo');
      }
      const pertenece = await this.usuariosService.belongsToEntidad(
        uid,
        idEntidad,
      );
      if (!pertenece) {
        throw new BadRequestException(
          'Un usuario mencionado no pertenece a su entidad',
        );
      }
    }

    const userEmail = user.email || user.nombreUsuario || 'Sistema';
    const gestion = await this.gestionesService.create({
      ...gestionData,
      usuario: userEmail,
      mencionado_uid: uidsMencionados[0] ?? null,
      mencionados_uids:
        uidsMencionados.length > 0 ? JSON.stringify(uidsMencionados) : null,
    });

    if (uidsMencionados.length > 0) {
      const persona = await this.personaRepository.findOne({
        where: { id: createGestionDto.idPersona },
      });
      const personaNombre = persona
        ? persona.apellidoNombre ||
        `${persona.apellido}, ${persona.nombre}`.trim()
        : `Persona #${createGestionDto.idPersona}`;

      for (const destinatarioUid of uidsMencionados) {
        await this.notificacionesService.createForMencion({
          destinatarioUid,
          emisorUid: user.id,
          emailEmisor: userEmail,
          idEntidad,
          idGestion: gestion.id,
          idPersona: createGestionDto.idPersona,
          personaNombre,
          accion: createGestionDto.accion,
          contacto: createGestionDto.contacto,
          observaciones: createGestionDto.observaciones,
        });
      }
    }

    return gestion;
  }

  @Sse('events')
  @Permissions('lectura:gestion')
  @ApiOperation({ summary: 'Suscribirse a eventos de gestiones (SSE)' })
  sendEvents() {
    return this.gestionesService
      .getEvents()
      .pipe(map((event) => ({ data: event })));
  }

  @Get()
  @Permissions('lectura:gestion')
  @ApiOperation({
    summary:
      'Historial de gestiones (solo admin/sys-admin). Filtra por entidad y gestor.',
  })
  async findAll(
    @Req() req: { user?: UserGestionCobranza },
    @Query('todas') todas?: string,
    @Query('gestor') gestor?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user;
    if (!user) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const isAdmin = user.roles?.includes(Roles.ADMIN);
    const isSysAdmin = user.roles?.includes(Roles.SYS_ADMIN);
    if (!isAdmin && !isSysAdmin) {
      throw new ForbiddenException('Sin permisos para ver el historial');
    }

    const wantsAll = String(todas).toLowerCase() === 'true';

    // - Si "todas=true": devuelve todas las entidades permitidas por el usuario (o todas si sys-admin sin lista)
    // - Caso contrario: usa la entidad resuelta por header/permisos (FirebaseStrategy)
    const entidadIds = wantsAll
      ? isSysAdmin
        ? user.idEntidades?.length
          ? user.idEntidades
          : undefined
        : user.idEntidades
      : user.idEntidad != null
        ? [user.idEntidad]
        : [];

    const safeLimit = Math.max(
      1,
      Math.min(500, Number.parseInt(String(limit || '200'), 10) || 200),
    );

    const gestiones = await this.gestionesService.findHistorial({
      entidadIds: entidadIds?.length ? entidadIds : undefined,
      gestor: gestor?.trim() || undefined,
      desde: desde?.trim() || undefined,
      hasta: hasta?.trim() || undefined,
      limit: safeLimit,
    });

    return gestiones.map((g) => ({
      id: g.id,
      idPersona: g.idPersona,
      fecha_hora: g.fecha_hora,
      accion: g.accion,
      contacto: g.contacto,
      observaciones: g.observaciones,
      usuario: g.usuario,
      persona: g.persona
        ? {
          id: g.persona.id,
          idEntidad: g.persona.idEntidad,
          apellidoNombre:
            g.persona.apellidoNombre ||
            `${g.persona.apellido}, ${g.persona.nombre}`.trim(),
        }
        : null,
    }));
  }
}
