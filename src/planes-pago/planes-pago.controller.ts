import { Controller, Get, Post, Patch, Body, Query, UseGuards, Param, NotFoundException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanesPagoService } from './planes-pago.service';
import { CreatePlanPagoDto } from './dto/create-plan-pago.dto';
import { UpdatePlanPagoDto } from './dto/update-plan-pago.dto';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Planes de Pago')
@ApiBearerAuth()
@UseGuards(FirebaseGuard, PermissionsGuard)
@Controller('planes-pago')
export class PlanesPagoController {
  constructor(private readonly planesPagoService: PlanesPagoService) {}

  @Get()
  @Permissions('lectura:persona')
  @ApiOperation({ summary: 'Obtener planes de pago' })
  findAll(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Query('producto') producto?: string
  ) {
    return this.planesPagoService.findAll({
      producto,
      idEntidad: req.user?.idEntidad,
      roles: req.user?.roles
    });
  }

  @Post()
  @Permissions('escritura:persona')
  @ApiOperation({ summary: 'Crear un nuevo plan de pago' })
  create(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Body() dto: CreatePlanPagoDto
  ) {
    const isSysAdmin = req.user?.roles?.includes('sys-admin');
    
    // Si no es sys-admin, forzar su idEntidad
    if (!isSysAdmin && req.user?.idEntidad) {
      dto.idEntidad = req.user.idEntidad;
    }
    
    return this.planesPagoService.create(dto);
  }

  @Patch(':id/toggle')
  @Permissions('escritura:persona')
  @ApiOperation({ summary: 'Habilitar o deshabilitar un plan de pago' })
  async toggle(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Param('id') id: string
  ) {
    const res = await this.planesPagoService.toggleActivo(
      +id, 
      req.user?.idEntidad, 
      req.user?.roles
    );
    if (!res) throw new NotFoundException('Plan no encontrado o acceso denegado');
    return res;
  }

  @Patch(':id')
  @Permissions('escritura:persona')
  @ApiOperation({ summary: 'Actualizar un plan de pago' })
  async update(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Param('id') id: string,
    @Body() dto: UpdatePlanPagoDto
  ) {
    const res = await this.planesPagoService.update(
      +id,
      dto,
      req.user?.idEntidad,
      req.user?.roles
    );
    if (!res) throw new NotFoundException('Plan no encontrado o acceso denegado');
    return res;
  }
}
