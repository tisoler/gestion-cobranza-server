import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../entities/persona.entity';
import { Patente } from '../entities/patente.entity';
import { CuotaPatente } from '../entities/cuota-patente.entity';
import { TgiUrbano } from '../entities/tgi-urbano.entity';
import { CuotaTgiUrbano } from '../entities/cuota-tgi-urbano.entity';
import { TgiRural } from '../entities/tgi-rural.entity';
import { CuotaTgiRural } from '../entities/cuota-tgi-rural.entity';
import { ImportacionesController } from './importaciones.controller';
import { ImportacionesService } from './importaciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Persona, Patente, CuotaPatente, TgiUrbano, CuotaTgiUrbano, TgiRural, CuotaTgiRural])],
  controllers: [ImportacionesController],
  providers: [ImportacionesService],
})
export class ImportacionesModule {}
