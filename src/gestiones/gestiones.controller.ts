import { Controller, Get, Post, Body, Sse, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GestionesService } from './gestiones.service';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateGestionDto } from './dto/create-gestion.dto';
import { map } from 'rxjs';

@ApiTags('Gestiones')
@ApiBearerAuth()
@Controller('gestiones')
@UseGuards(FirebaseGuard, PermissionsGuard)
export class GestionesController {
  constructor(private readonly gestionesService: GestionesService) {}

  @Post()
  @Permissions('escritura:gestion')
  @ApiOperation({ summary: 'Crear una nueva gestión' })
  @ApiResponse({ status: 201, description: 'Gestión creada correctamente.' })
  create(@Body() createGestionDto: CreateGestionDto) {
    return this.gestionesService.create(createGestionDto);
  }

  @Sse('events')
  @Permissions('lectura:gestion')
  @ApiOperation({ summary: 'Suscribirse a eventos de gestiones (SSE)' })
  sendEvents() {
    return this.gestionesService.getEvents().pipe(
      map((event) => ({ data: event })),
    );
  }
}
