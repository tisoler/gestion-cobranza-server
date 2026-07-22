import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Persona } from '../entities/persona.entity';
import { Patente } from '../entities/patente.entity';
import { TgiUrbano } from '../entities/tgi-urbano.entity';
import { TgiRural } from '../entities/tgi-rural.entity';
import { Gestion } from '../entities/gestion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Persona,
      Patente,
      TgiUrbano,
      TgiRural,
      Gestion,
    ])
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
