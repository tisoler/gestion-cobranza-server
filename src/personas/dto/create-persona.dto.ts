import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePersonaDto {
  @ApiPropertyOptional({ description: 'DNI de la persona' })
  @IsString()
  @IsOptional()
  dni?: string;

  @ApiPropertyOptional({ description: 'Tipo de documento (DNI, CUIT, etc.)' })
  @IsString()
  @IsOptional()
  tipoDoc?: string;

  @ApiPropertyOptional({ description: 'Número de documento' })
  @IsString()
  @IsOptional()
  nroDoc?: string;

  @ApiPropertyOptional({ description: 'CUIT de la persona' })
  @IsString()
  @IsOptional()
  cuit?: string;

  @ApiProperty({ description: 'Nombre de la persona' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'Apellido de la persona' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiPropertyOptional({ description: 'Apellido y nombre unificado' })
  @IsString()
  @IsOptional()
  apellidoNombre?: string;

  @ApiPropertyOptional({ description: 'Calle del domicilio' })
  @IsString()
  @IsOptional()
  calleDomicilio?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email de contacto' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Entidad a la que pertenece la persona' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idEntidad?: number;
}
