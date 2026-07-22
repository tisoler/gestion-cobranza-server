import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGestionDto {
  @ApiProperty({ description: 'ID de la persona asociada' })
  @IsInt()
  @IsNotEmpty()
  idPersona: number;

  @ApiProperty({ description: 'Acción realizada' })
  @IsString()
  @IsNotEmpty()
  accion: string;

  @ApiProperty({ description: 'Contacto con el que se realizó la gestión' })
  @IsString()
  @IsNotEmpty()
  contacto: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'UIDs Firebase de usuarios mencionados con @ en el mensaje',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mencionadosUids?: string[];

  @ApiPropertyOptional({
    description: 'Deprecated: usar mencionadosUids',
  })
  @IsString()
  @IsOptional()
  mencionadoUid?: string;
}
