import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';

const trimOrUndef = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class AddContactoDto {
  @ApiPropertyOptional({
    description:
      'Nuevo teléfono (pasa a ser el actual; los anteriores quedan en historial)',
  })
  @IsOptional()
  @Transform(trimOrUndef)
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    description:
      'Nuevo email (pasa a ser el actual; los anteriores quedan en historial)',
  })
  @IsOptional()
  @Transform(trimOrUndef)
  @IsEmail()
  email?: string;
}
