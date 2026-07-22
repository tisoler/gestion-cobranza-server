import { Module } from '@nestjs/common';
import { ScolerContactoController } from './scoler/contacto.controller';
import { ScolerContactoService } from './scoler/contacto.service';
import { ScolerIncomingController } from './scoler/incoming.controller';
import { ScolerIncomingService } from './scoler/incoming.service';
import { AstreCampaniaController } from './astre/campania.controller';
import { AstreCampaniaService } from './astre/campania.service';

@Module({
  controllers: [ScolerContactoController, ScolerIncomingController, AstreCampaniaController],
  providers: [ScolerContactoService, ScolerIncomingService, AstreCampaniaService],
  exports: [ScolerContactoService, ScolerIncomingService, AstreCampaniaService],
})
export class MailModule {}
