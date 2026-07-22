import { Controller, Get, Query, UseGuards, UnauthorizedException, Req } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('reportes')
@UseGuards(FirebaseGuard, PermissionsGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  @Permissions('lectura:persona')
  async getDashboard(
    @Query('idEntidad') idEntidadStr: string,
    @Req() req: any
  ) {
    const user = req.user;
    let idEntidad = parseInt(idEntidadStr, 10);
    if (!idEntidad && user?.idEntidad) {
      idEntidad = user.idEntidad;
    }
    
    if (!idEntidad) {
      throw new UnauthorizedException('Debe especificar una entidad');
    }

    if (user?.roles?.includes('sys-admin')) {
      // Sys-admin can query any entity, handled by idEntidad param
    } else if (user?.idEntidad !== idEntidad) {
       throw new UnauthorizedException('No tiene permisos para consultar esta entidad');
    }

    return this.reportesService.getDashboardData(idEntidad);
  }
}
