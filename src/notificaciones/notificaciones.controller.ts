import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { NotificacionesService } from './notificaciones.service';
import type { UserGestionCobranza } from '../auth/strategies/firebase.strategy';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@UseGuards(FirebaseGuard, PermissionsGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  @Permissions('lectura:gestion')
  @ApiOperation({ summary: 'Listar notificaciones del usuario logueado' })
  findAll(@Req() req: { user?: UserGestionCobranza }) {
    return this.notificacionesService.findForUser(
      req.user?.id,
      req.user?.idEntidad,
    );
  }

  @Get('no-leidas/count')
  @Permissions('lectura:gestion')
  @ApiOperation({ summary: 'Cantidad de notificaciones sin leer' })
  async countUnread(@Req() req: { user?: UserGestionCobranza }) {
    const count = await this.notificacionesService.countUnread(
      req.user?.id,
      req.user?.idEntidad,
    );
    return { count };
  }

  @Patch('leer-todas')
  @Permissions('lectura:gestion')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  markAllAsRead(@Req() req: { user?: UserGestionCobranza }) {
    return this.notificacionesService.markAllAsRead(
      req.user?.id ?? '',
      req.user?.idEntidad,
    );
  }

  @Patch(':id/leida')
  @Permissions('lectura:gestion')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  async markAsRead(
    @Req() req: { user?: UserGestionCobranza },
    @Param('id') id: string,
  ) {
    const res = await this.notificacionesService.markAsRead(+id, req.user?.id);
    if (!res) throw new NotFoundException('Notificación no encontrada');
    return res;
  }
}
