import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UsuariosService } from './usuarios.service';
import type { UserGestionCobranza } from '../auth/strategies/firebase.strategy';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(FirebaseGuard, PermissionsGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('entidad')
  @Permissions('lectura:gestion')
  @ApiOperation({
    summary:
      'Listar usuarios de la entidad activa desde Firestore (idEntidades / nombre)',
  })
  findByEntidad(@Req() req: { user?: UserGestionCobranza }) {
    const idEntidad = req.user?.idEntidad;
    if (!idEntidad) return [];
    return this.usuariosService.findByEntidad(idEntidad);
  }
}
