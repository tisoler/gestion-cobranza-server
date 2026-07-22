import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScolerContactoService } from './contacto.service';
import { CreateContactoDto } from './dto/create-contacto.dto';

@ApiTags('Mail Scoler')
@Controller('mail/scoler')
export class ScolerContactoController {
  constructor(private readonly contactoService: ScolerContactoService) {}

  @Post('contacto')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enviar formulario de contacto de Scoler' })
  @ApiBody({ type: CreateContactoDto })
  enviarContacto(@Body() dto: CreateContactoDto) {
    return this.contactoService.enviarContacto(dto);
  }
}
