import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PersonasService } from './personas.service';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { AddContactoDto } from './dto/add-contacto.dto';

@ApiTags('Personas')
@ApiBearerAuth()
@Controller('personas')
@UseGuards(FirebaseGuard, PermissionsGuard)
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  @Permissions('lectura:persona')
  @ApiOperation({
    summary: 'Obtener todas las personas con filtros y paginado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de personas filtrada y paginada.',
  })
  findAll(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Query('dni') dni?: string,
    @Query('cuit') cuit?: string,
    @Query('nombre') nombre?: string,
    @Query('apellido') apellido?: string,
    @Query('telefono') telefono?: string,
    @Query('email') email?: string,
    @Query('numeroPadron') numeroPadron?: string,
    @Query('codigoWeb') codigoWeb?: string,
    @Query('patente') patente?: string,
    @Query('sort') sort?: string,
    @Query('page') page: number = 1,
  ) {
    return this.personasService.findAll({
      idEntidad: req.user?.idEntidad,
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
      page,
      roles: req.user?.roles,
    });
  }

  @Patch(':id/contacto')
  @Permissions('escritura:persona')
  @ApiOperation({
    summary:
      'Agregar teléfono y/o email (historial; el último agregado queda como actual)',
  })
  @ApiResponse({ status: 200, description: 'Persona actualizada.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async patchContacto(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Param('id') id: string,
    @Body() dto: AddContactoDto,
  ) {
    const persona = await this.personasService.addContacto(
      +id,
      req.user?.idEntidad,
      dto,
    );
    if (!persona) {
      throw new NotFoundException('Persona no encontrada');
    }
    return persona;
  }

  @Get(':id')
  @Permissions('lectura:persona')
  @ApiOperation({ summary: 'Obtener una persona por ID' })
  @ApiResponse({ status: 200, description: 'Persona encontrada.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async findOne(
    @Req() req: { user?: { idEntidad?: number } },
    @Param('id') id: string,
  ) {
    const persona = await this.personasService.findOne(
      +id,
      req.user?.idEntidad,
    );
    if (!persona) {
      throw new NotFoundException('Persona no encontrada');
    }
    return persona;
  }

  @Post()
  @Permissions('escritura:persona')
  @ApiOperation({ summary: 'Crear una nueva persona' })
  @ApiResponse({ status: 201, description: 'Persona creada correctamente.' })
  create(@Body() createPersonaDto: CreatePersonaDto) {
    return this.personasService.create(createPersonaDto);
  }

  @Patch(':id/habilitado')
  @Permissions('escritura:persona')
  @ApiOperation({ summary: 'Cambiar estado de habilitado de una persona' })
  @ApiResponse({ status: 200, description: 'Estado actualizado.' })
  @ApiResponse({ status: 404, description: 'Persona no encontrada.' })
  async toggleHabilitado(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @Param('id') id: string,
  ) {
    const persona = await this.personasService.toggleHabilitado(+id, req.user?.idEntidad);
    if (!persona) {
      throw new NotFoundException('Persona no encontrada');
    }
    return persona;
  }
}
