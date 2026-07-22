import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendCampaniaDto } from './dto/send-campania.dto';
import { ResendSendResponse } from '../shared/resend-mail.types';

@Injectable()
export class AstreCampaniaService {
  constructor(private readonly configService: ConfigService) {}

  async enviarCampania(dto: SendCampaniaDto) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY_ASTRE');
    const fromEmail = this.configService.get<string>('ASTRE_FROM_EMAIL') ?? 'no-reply@astre.net.ar';
    const appName = this.configService.get<string>('ASTRE_APP_NAME') ?? 'Astre';

    if (!apiKey) {
      throw new InternalServerErrorException('Falta configurar RESEND_API_KEY_ASTRE');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'gestion-cobranza-server/0.0.1',
      },
      body: JSON.stringify({
        from: `${appName} <${fromEmail}>`,
        to: [dto.destinatario],
        subject: dto.asunto,
        html: dto.html,
        text: dto.text,
      }),
    });

    const payload = (await response.json()) as ResendSendResponse;

    if (!response.ok) {
      const message = payload.error?.message ?? 'No se pudo enviar el correo';
      throw new BadRequestException(message);
    }

    return { ok: true, id: payload.id };
  }
}
