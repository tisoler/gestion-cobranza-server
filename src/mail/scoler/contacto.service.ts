import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { ResendSendResponse } from '../shared/resend-mail.types';
import { escapeHtml } from '../shared/escape-html';
import { parseEmailList } from '../shared/email-list';

@Injectable()
export class ScolerContactoService {
  constructor(private readonly configService: ConfigService) { }

  async enviarContacto(dto: CreateContactoDto) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY_SCOLER');
    const fromEmail = this.configService.get<string>('SCOLER_CONTACT_FROM_EMAIL') ?? 'contacto@scoler.com.ar';
    const toEmail = this.configService.get<string>('SCOLER_CONTACT_TO_EMAIL');
    const appName = this.configService.get<string>('SCOLER_APP_NAME') ?? 'Scoler Servicios';

    if (!apiKey) {
      throw new InternalServerErrorException('Falta configurar RESEND_API_KEY_SCOLER');
    }

    if (!toEmail) {
      throw new InternalServerErrorException('Falta configurar SCOLER_CONTACT_TO_EMAIL');
    }

    const html = this.buildHtml(dto, appName);
    const text = this.buildText(dto, appName);
    const emailsTo = parseEmailList(toEmail);

    if (emailsTo.length === 0) {
      throw new InternalServerErrorException('SCOLER_CONTACT_TO_EMAIL no tiene destinatarios válidos');
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
        to: emailsTo,
        reply_to: dto.email,
        subject: `Nuevo contacto desde formulario de la web - ${dto.empresa}`,
        html,
        text,
      }),
    });

    const payload = (await response.json()) as ResendSendResponse;

    if (!response.ok) {
      const message = payload.error?.message ?? 'No se pudo enviar el correo';
      throw new BadRequestException(message);
    }

    return { ok: true, id: payload.id };
  }

  private buildHtml(dto: CreateContactoDto, appName: string) {
    const mensaje = dto.mensaje?.trim() || 'Sin mensaje adicional.';

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 16px;">Nuevo contacto desde ${appName}</h2>
        <p style="margin: 0 0 12px;"><strong>Nombre:</strong> ${escapeHtml(dto.nombre)}</p>
        <p style="margin: 0 0 12px;"><strong>Empresa:</strong> ${escapeHtml(dto.empresa)}</p>
        <p style="margin: 0 0 12px;"><strong>Email:</strong> ${escapeHtml(dto.email)}</p>
        <p style="margin: 0 0 12px;"><strong>Teléfono:</strong> ${escapeHtml(dto.telefono)}</p>
        <p style="margin: 0 0 12px;"><strong>Volumen de cartera:</strong> ${escapeHtml(dto.volumen)}</p>
        <p style="margin: 0 0 12px;"><strong>Mensaje:</strong><br/>${escapeHtml(mensaje).replace(/\n/g, '<br/>')}</p>
      </div>
    `;
  }

  private buildText(dto: CreateContactoDto, appName: string) {
    const mensaje = dto.mensaje?.trim() || 'Sin mensaje adicional.';
    return [
      `Nuevo contacto desde ${appName}`,
      `Nombre: ${dto.nombre}`,
      `Empresa: ${dto.empresa}`,
      `Email: ${dto.email}`,
      `Teléfono: ${dto.telefono}`,
      `Volumen de cartera: ${dto.volumen}`,
      `Mensaje: ${mensaje}`,
    ].join('\n');
  }
}
