import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendCampaniaDto {
  @IsEmail()
  @MaxLength(180)
  destinatario: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  asunto: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40000)
  html: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  text?: string;
}
