import { IsString, IsArray, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PersonaImportRowDto {
  @ApiProperty()
  @IsString()
  tipo_doc?: string;

  @ApiProperty()
  @IsString()
  nro_doc?: string;

  @ApiProperty()
  @IsString()
  cuit?: string;

  @ApiProperty()
  @IsString()
  apellido_nombre?: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  apellido: string;

  @ApiProperty()
  @IsString()
  calle_domicilio?: string;

  @ApiProperty()
  @IsString()
  numero_domicilio?: string;

  @ApiProperty()
  @IsString()
  piso_domicilio?: string;

  @ApiProperty()
  @IsString()
  depto_domicilio?: string;

  @ApiProperty()
  @IsString()
  localidad?: string;

  @ApiProperty()
  @IsString()
  provincia?: string;

  @ApiProperty()
  @IsString()
  telefono?: string;

  @ApiProperty()
  @IsString()
  email?: string;
}

export class ImportPersonasDto {
  @ApiProperty({
    description:
      'Target de importacion: personas, tgi_urbano, tgi_rural, patentes',
  })
  @IsString()
  target: string;

  @ApiProperty({ description: 'Mapeo de columnas del CSV' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  columnMapping: Record<string, string>;

  @ApiProperty({ description: 'Filas de datos a importar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonaImportRowDto)
  rows: PersonaImportRowDto[];
}
