import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ScolerIncomingService } from './incoming.service';
import { ResendIncomingWebhookPayload } from './types/resend-incoming-webhook';

@ApiTags('Mail Scoler')
@Controller('mail/scoler')
export class ScolerIncomingController {
  constructor(private readonly incomingService: ScolerIncomingService) {}

  @Post('incoming')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recibir emails de Resend y reenviarlos a los destinatarios configurados' })
  recibirIncoming(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: ResendIncomingWebhookPayload,
  ) {
    return this.incomingService.handleWebhook({
      body,
      rawBody: req.rawBody?.toString('utf8') ?? null,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
  }
}
