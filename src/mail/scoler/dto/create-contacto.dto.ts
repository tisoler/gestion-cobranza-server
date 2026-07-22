import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  empresa: string;

  @IsEmail()
  @MaxLength(180)
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(50)
  telefono: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  volumen: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensaje?: string;
}
