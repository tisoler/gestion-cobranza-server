import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Param,
  NotFoundException,
  Req,
  BadRequestException,
} from '@nestjs/common';
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
  @Permissions('lectura:planespago')
  @ApiOperation({ summary: 'Obtener planes de pago' })
  findAll(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Query('producto') producto?: string,
  ) {
    return this.planesPagoService.findAll({
      producto,
      idEntidad: req.user?.idEntidad,
      roles: req.user?.roles,
    });
  }

  @Post()
  @Permissions('escritura:planespago')
  @ApiOperation({ summary: 'Crear un nuevo plan de pago' })
  create(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Body() dto: CreatePlanPagoDto,
  ) {
    // Force idEntidad from context if not provided (for admin)
    // or allow sys-admin to provide it.
    if (!dto.idEntidad && req.user?.idEntidad) {
      dto.idEntidad = req.user.idEntidad;
    }

    if (!dto.idEntidad) {
      throw new BadRequestException(
        'Debe especificar una entidad para el plan de pago',
      );
    }

    return this.planesPagoService.create(dto);
  }

  @Patch(':id/toggle')
  @Permissions('escritura:planespago')
  @ApiOperation({ summary: 'Habilitar o deshabilitar un plan de pago' })
  async toggle(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Param('id') id: string,
  ) {
    const res = await this.planesPagoService.toggleActivo(
      +id,
      req.user?.idEntidad,
      req.user?.roles,
    );
    if (!res)
      throw new NotFoundException('Plan no encontrado o acceso denegado');
    return res;
  }

  @Patch(':id')
  @Permissions('escritura:planespago')
  @ApiOperation({ summary: 'Actualizar un plan de pago' })
  async update(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Param('id') id: string,
    @Body() dto: UpdatePlanPagoDto,
  ) {
    const res = await this.planesPagoService.update(
      +id,
      dto,
      req.user?.idEntidad,
      req.user?.roles,
    );
    if (!res)
      throw new NotFoundException('Plan no encontrado o acceso denegado');
    return res;
  }
}
