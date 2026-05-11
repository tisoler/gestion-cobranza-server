import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacionesService } from './importaciones.service';
import { FirebaseGuard } from '../auth/guards/firebase.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Importaciones')
@ApiBearerAuth()
@UseGuards(FirebaseGuard, PermissionsGuard)
@Controller('importaciones')
export class ImportacionesController {
  constructor(private readonly importacionesService: ImportacionesService) { }

  @Post('preview')
  @Permissions('escritura:persona')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Vista previa de importacion de CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        target: {
          type: 'string',
          description: 'personas, tgi_urbano, tgi_rural, patentes',
        },
        columnMapping: {
          type: 'string',
          description: 'JSON con mapeo de columnas',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vista previa generada correctamente.',
  })
  async previewImport(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @UploadedFile() file: Express.Multer.File,
    @Body('target') target: string,
    @Body('columnMapping') columnMappingJson: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporciono archivo');
    }

    let columnMapping: Record<string, string>;
    try {
      columnMapping = JSON.parse(columnMappingJson) as Record<string, string>;
    } catch {
      throw new BadRequestException(
        'El mapeo de columnas debe ser un JSON valido',
      );
    }

    if (target !== 'personas' && target !== 'patentes') {
      throw new BadRequestException(
        'Solo se soporta la importacion de personas y patentes por el momento',
      );
    }

    const { headers, rows } = this.importacionesService.parseCsv(
      file.buffer,
      columnMapping,
    );

    let resultado;
    if (target === 'personas') {
      resultado = await this.importacionesService.previewImportPersonas(
        rows,
        req.user?.idEntidad,
      );
    } else {
      resultado = await this.importacionesService.previewImportPatentes(
        rows,
        req.user?.idEntidad,
      );
    }

    return {
      headers,
      totalFilas: resultado.totalFilas,
      nuevas: resultado.nuevas,
      existentes: resultado.existentes,
      sinPersona: resultado.sinPersona, // Nuevo para patentes
      cantidadNuevas: resultado.nuevas?.length || 0,
      cantidadExistentes: resultado.existentes?.length || 0,
      cantidadSinPersona: resultado.sinPersona?.length || 0,
    };
  }

  @Post('personas')
  @Permissions('escritura:persona')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar personas desde CSV (solo nuevas)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        columnMapping: {
          type: 'string',
          description: 'JSON con mapeo de columnas',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Importación completada.' })
  async importPersonas(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMappingJson: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporciono archivo');
    }

    let columnMapping: Record<string, string>;
    try {
      columnMapping = JSON.parse(columnMappingJson) as Record<string, string>;
    } catch {
      throw new BadRequestException(
        'El mapeo de columnas debe ser un JSON valido',
      );
    }

    // Parseamos de nuevo el CSV en el servidor para evitar enviar miles de filas por JSON
    const { rows } = this.importacionesService.parseCsv(
      file.buffer,
      columnMapping,
    );

    if (rows.length === 0) {
      throw new BadRequestException('No se encontraron filas para importar');
    }

    const resultado = await this.importacionesService.importPersonas(
      rows,
      req.user?.idEntidad,
    );

    return {
      mensaje: `Se agregaron ${resultado.cantidadAgregadas} persona(s) nueva(s)`,
      cantidadAgregadas: resultado.cantidadAgregadas,
    };
  }

  @Post('patentes')
  @Permissions('escritura:persona')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar patentes desde CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        columnMapping: { type: 'string' },
        personLinks: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Importación completada.' })
  async importPatentes(
    @Req() req: { user?: { idEntidad?: number; roles?: string[] } },
    @UploadedFile() file: Express.Multer.File,
    @Body('columnMapping') columnMappingJson: string,
    @Body('personLinks') personLinksJson: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporciono archivo');
    }

    let columnMapping: Record<string, string>;
    let personLinks: Record<number, number>;
    try {
      columnMapping = JSON.parse(columnMappingJson) as Record<string, string>;
      personLinks = JSON.parse(personLinksJson || '{}') as Record<number, number>;
    } catch {
      throw new BadRequestException('El mapeo o los links deben ser JSON validos');
    }

    const { rows } = this.importacionesService.parseCsv(
      file.buffer,
      columnMapping,
    );

    if (rows.length === 0) {
      throw new BadRequestException('No se encontraron filas para importar');
    }

    const resultado = await this.importacionesService.importPatentes(
      rows,
      personLinks,
      req.user?.idEntidad,
    );

    return {
      mensaje: `Se agregaron ${resultado.patentesNuevas} patente(s) y ${resultado.cuotasInsertadas} cuota(s)`,
      cantidadAgregadas: resultado.patentesNuevas,
      cantidadCuotasAgregadas: resultado.cuotasInsertadas,
    };
  }
}
