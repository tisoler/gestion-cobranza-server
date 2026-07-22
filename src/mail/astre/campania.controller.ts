import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AstreCampaniaService } from './campania.service';
import { SendCampaniaDto } from './dto/send-campania.dto';

@ApiTags('Mail Astre')
@Controller('mail/astre')
export class AstreCampaniaController {
  constructor(private readonly campaniaService: AstreCampaniaService) {}

  @Post('campania')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enviar correo transaccional/campaña de Astre' })
  @ApiBody({ type: SendCampaniaDto })
  enviarCampania(@Body() dto: SendCampaniaDto) {
    return this.campaniaService.enviarCampania(dto);
  }
}
