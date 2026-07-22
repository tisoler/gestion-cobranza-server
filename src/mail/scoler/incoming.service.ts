import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { parseEmailList } from '../shared/email-list';
import { ResendSendResponse } from '../shared/resend-mail.types';
import { escapeHtml } from '../shared/escape-html';
import { ResendIncomingWebhookPayload } from './types/resend-incoming-webhook';

type ResendReceivedEmail = {
  id?: string;
  to?: string[];
  from?: string;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
  attachments?: Array<{
    filename?: string;
    content_type?: string;
    content_disposition?: string | null;
    content_id?: string | null;
    size?: number;
  }>;
};

@Injectable()
export class ScolerIncomingService {
  constructor(private readonly configService: ConfigService) { }

  async handleWebhook(params: {
    body: ResendIncomingWebhookPayload;
    rawBody: string | null;
    headers: Record<string, string | string[] | undefined>;
  }) {
    this.assertSignature(params.rawBody, params.headers);

    if (params.body.type !== 'email.received') {
      return { ok: true, ignored: true, type: params.body.type ?? null };
    }

    const emailId = params.body.data?.email_id?.trim();
    if (!emailId) {
      throw new BadRequestException('Falta el email_id del evento recibido');
    }

    const recipients = this.getRecipients();
    const appName = this.configService.get<string>('SCOLER_APP_NAME') ?? 'Scoler Servicios';

    const email = await this.getReceivedEmail(emailId);
    const subject = email.subject?.trim() || '(sin asunto)';
    const sourceTo = (email.to ?? params.body.data?.to ?? []).filter(Boolean);
    const sourceFrom = email.from?.trim() || params.body.data?.from?.trim() || 'desconocido';
    const forwardedFrom = sourceTo[0] ?? this.configService.get<string>('SCOLER_CONTACT_FROM_EMAIL') ?? 'contacto@scoler.com.ar';
    const attachments = email.attachments ?? [];
    const html = this.buildForwardHtml({
      appName,
      emailId,
      subject,
      sourceFrom,
      sourceTo,
      html: email.html,
      text: email.text,
      attachments,
    });
    const text = this.buildForwardText({
      appName,
      emailId,
      subject,
      sourceFrom,
      sourceTo,
      html: email.html,
      text: email.text,
      attachments,
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'gestion-cobranza-server/0.0.1',
        'Idempotency-Key': `incoming-${emailId}-${recipients.join(',')}`,
      },
      body: JSON.stringify({
        from: forwardedFrom,
        to: recipients,
        reply_to: sourceFrom,
        subject: `[Resend Incoming] ${subject}`,
        html,
        text,
      }),
    });

    const payload = (await response.json()) as ResendSendResponse;

    if (!response.ok) {
      const message = payload.error?.message ?? 'No se pudo reenviar el correo recibido';
      throw new BadRequestException(message);
    }

    return {
      ok: true,
      emailId,
      recipients,
      resendEmailId: payload.id,
    };
  }

  private async getReceivedEmail(emailId: string): Promise<ResendReceivedEmail> {
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: {
        Authorization: `Bearer ${this.getApiKey()}`,
        'User-Agent': 'gestion-cobranza-server/0.0.1',
      },
    });

    const payload = (await response.json()) as { error?: { message?: string } } & ResendReceivedEmail;

    if (!response.ok) {
      const message = payload.error?.message ?? 'No se pudo obtener el correo recibido';
      throw new BadRequestException(message);
    }

    return payload;
  }

  private getRecipients(): string[] {
    const recipients = parseEmailList(
      this.configService.get<string>('SCOLER_INCOMING_TO_EMAILS') ??
      this.configService.get<string>('SCOLER_CONTACT_TO_EMAIL'),
    );

    if (recipients.length === 0) {
      throw new InternalServerErrorException('Falta configurar SCOLER_CONTACT_TO_EMAIL o SCOLER_INCOMING_TO_EMAILS');
    }

    return recipients;
  }

  private getApiKey(): string {
    const apiKey = this.configService.get<string>('RESEND_API_KEY_SCOLER');
    if (!apiKey) {
      throw new InternalServerErrorException('Falta configurar RESEND_API_KEY_SCOLER');
    }
    return apiKey;
  }

  private assertSignature(rawBody: string | null, headers: Record<string, string | string[] | undefined>) {
    const signingSecret = this.configService.get<string>('SCOLER_RESEND_WEBHOOK_SIGNING_SECRET')?.trim();
    if (!signingSecret) {
      throw new InternalServerErrorException('Falta configurar SCOLER_RESEND_WEBHOOK_SIGNING_SECRET');
    }

    if (!rawBody) {
      throw new InternalServerErrorException('No se pudo leer el body crudo del webhook');
    }

    const svixId = this.getHeader(headers, 'svix-id');
    const svixTimestamp = this.getHeader(headers, 'svix-timestamp');
    const svixSignature = this.getHeader(headers, 'svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('Faltan headers de firma del webhook');
    }

    const timestamp = Number(svixTimestamp);
    if (!Number.isFinite(timestamp)) {
      throw new UnauthorizedException('Timestamp de webhook inválido');
    }

    const toleranceSeconds = this.configService.get<number>('SCOLER_RESEND_WEBHOOK_TOLERANCE_SECONDS') ?? 300;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
      throw new UnauthorizedException('Webhook expirado');
    }

    const expectedSignature = this.computeSignature(signingSecret, svixId, svixTimestamp, rawBody);
    const signatures = svixSignature.split(' ').map((entry) => entry.trim()).filter(Boolean);

    const matched = signatures.some((signature) => {
      const [version, value] = signature.split(',', 2);
      if (version !== 'v1' || !value) {
        return false;
      }

      const expected = Buffer.from(expectedSignature);
      const received = Buffer.from(value);
      if (expected.length !== received.length) {
        return false;
      }

      return timingSafeEqual(expected, received);
    });

    if (!matched) {
      throw new UnauthorizedException('Firma de webhook inválida');
    }
  }

  private computeSignature(secret: string, svixId: string, svixTimestamp: string, rawBody: string) {
    const secretValue = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const secretBytes = Buffer.from(secretValue, 'base64');
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

    return createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  }

  private getHeader(headers: Record<string, string | string[] | undefined>, name: string) {
    const lowerName = name.toLowerCase();
    const value = headers[name] ?? headers[lowerName];
    return Array.isArray(value) ? value[0] : value;
  }

  private buildForwardHtml(params: {
    appName: string;
    emailId: string;
    subject: string;
    sourceFrom: string;
    sourceTo: string[];
    html?: string | null;
    text?: string | null;
    attachments: ResendReceivedEmail['attachments'];
  }) {
    const attachmentsList = this.buildAttachmentListHtml(params.attachments);
    const originalContent =
      params.html?.trim() ||
      (params.text?.trim()
        ? `<pre style="white-space: pre-wrap; margin: 0;">${escapeHtml(params.text)}</pre>`
        : '<p style="margin: 0; color: #6b7280;">Sin cuerpo disponible.</p>');
    const sourceToHtml =
      params.sourceTo.length > 0
        ? params.sourceTo.map((email) => `<li>${escapeHtml(email)}</li>`).join('')
        : '<li>No informado</li>';

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 16px;">Nuevo correo recibido en ${escapeHtml(params.appName)}</h2>
        <p style="margin: 0 0 12px;"><strong>Email ID:</strong> ${escapeHtml(params.emailId)}</p>
        <p style="margin: 0 0 12px;"><strong>Asunto:</strong> ${escapeHtml(params.subject)}</p>
        <p style="margin: 0 0 12px;"><strong>Desde:</strong> ${escapeHtml(params.sourceFrom)}</p>
        <p style="margin: 0 0 6px;"><strong>Destino original:</strong></p>
        <ul style="margin: 0 0 16px 20px; padding: 0;">${sourceToHtml}</ul>
        ${attachmentsList}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <div>${originalContent}</div>
      </div>
    `;
  }

  private buildForwardText(params: {
    appName: string;
    emailId: string;
    subject: string;
    sourceFrom: string;
    sourceTo: string[];
    html?: string | null;
    text?: string | null;
    attachments: ResendReceivedEmail['attachments'];
  }) {
    const attachmentsText = this.buildAttachmentListText(params.attachments);
    const body = params.text?.trim() || (params.html?.trim() ? '[El cuerpo original llegó en HTML]' : 'Sin cuerpo disponible.');

    return [
      `Nuevo correo recibido en ${params.appName}`,
      `Email ID: ${params.emailId}`,
      `Asunto: ${params.subject}`,
      `Desde: ${params.sourceFrom}`,
      `Destino original: ${params.sourceTo.length > 0 ? params.sourceTo.join(', ') : 'No informado'}`,
      attachmentsText ? `Adjuntos: ${attachmentsText}` : null,
      '',
      body,
    ]
      .filter((line) => line !== null)
      .join('\n');
  }

  private buildAttachmentListHtml(attachments?: ResendReceivedEmail['attachments']) {
    if (!attachments || attachments.length === 0) {
      return '';
    }

    const items = attachments
      .map((attachment) => {
        const filename = attachment.filename?.trim() || 'Adjunto sin nombre';
        const type = attachment.content_type?.trim() || 'tipo desconocido';
        return `<li>${escapeHtml(filename)} <span style="color:#6b7280;">(${escapeHtml(type)})</span></li>`;
      })
      .join('');

    return `
      <p style="margin: 0 0 6px;"><strong>Adjuntos detectados:</strong></p>
      <ul style="margin: 0 0 16px 20px; padding: 0;">${items}</ul>
    `;
  }

  private buildAttachmentListText(attachments?: ResendReceivedEmail['attachments']) {
    if (!attachments || attachments.length === 0) {
      return '';
    }

    return attachments
      .map((attachment) => {
        const filename = attachment.filename?.trim() || 'Adjunto sin nombre';
        const type = attachment.content_type?.trim() || 'tipo desconocido';
        return `${filename} (${type})`;
      })
      .join(', ');
  }
}
