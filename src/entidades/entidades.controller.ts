import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EntidadesService } from './entidades.service';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Entidades')
@ApiBearerAuth()
@Controller('entidades')
@UseGuards(FirebaseGuard, PermissionsGuard)
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Get()
  @Permissions('lectura:entidad')
  @ApiOperation({
    summary: 'Obtener todas las entidades permitidas para el usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de entidades obtenida correctamente.',
  })
  findAll(@Req() req) {
    return this.entidadesService.findAll(req.user);
  }
}
