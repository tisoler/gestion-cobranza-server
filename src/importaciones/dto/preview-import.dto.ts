import { IsString, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ColumnMappingDto {
  @ApiProperty({
    description: 'Letra de columna para tipo_doc',
    required: false,
  })
  @IsString()
  tipo_doc?: string;

  @ApiProperty({
    description: 'Letra de columna para nro_doc',
    required: false,
  })
  @IsString()
  nro_doc?: string;

  @ApiProperty({ description: 'Letra de columna para cuit', required: false })
  @IsString()
  cuit?: string;

  @ApiProperty({ description: 'Letra de columna para nombre', required: false })
  @IsString()
  nombre?: string;

  @ApiProperty({
    description: 'Letra de columna para apellido',
    required: false,
  })
  @IsString()
  apellido?: string;

  @ApiProperty({
    description: 'Letra de columna para calle_domicilio',
    required: false,
  })
  @IsString()
  calle_domicilio?: string;

  @ApiProperty({
    description: 'Letra de columna para numero_domicilio',
    required: false,
  })
  @IsString()
  numero_domicilio?: string;

  @ApiProperty({
    description: 'Letra de columna para piso_domicilio',
    required: false,
  })
  @IsString()
  piso_domicilio?: string;

  @ApiProperty({
    description: 'Letra de columna para depto_domicilio',
    required: false,
  })
  @IsString()
  depto_domicilio?: string;

  @ApiProperty({
    description: 'Letra de columna para localidad',
    required: false,
  })
  @IsString()
  localidad?: string;

  @ApiProperty({
    description: 'Letra de columna para provincia',
    required: false,
  })
  @IsString()
  provincia?: string;

  @ApiProperty({
    description: 'Letra de columna para telefono',
    required: false,
  })
  @IsString()
  telefono?: string;

  @ApiProperty({ description: 'Letra de columna para email', required: false })
  @IsString()
  email?: string;
}

export class PreviewImportDto {
  @ApiProperty({
    description:
      'Target de importacion: personas, tgi_urbano, tgi_rural, patentes',
  })
  @IsString()
  target: string;

  @ApiProperty({ description: 'Mapeo de columnas del CSV' })
  @IsObject()
  @ValidateNested()
  @Type(() => ColumnMappingDto)
  columnMapping: ColumnMappingDto;
}
