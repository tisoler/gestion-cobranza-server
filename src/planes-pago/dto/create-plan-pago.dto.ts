import {
  IsString,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreatePlanPagoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  producto: string;

  @IsNumber()
  numeroCuotas: number;

  @IsNumber()
  @IsOptional()
  idEntidad?: number;

  @IsNumber()
  descuentoIntereses: number;

  @IsNumber()
  porcentajeAnticipo: number;

  @IsBoolean()
  activo: boolean;
}
