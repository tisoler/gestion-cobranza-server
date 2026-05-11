import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../entities/persona.entity';
import { Patente } from '../entities/patente.entity';
import { CuotaPatente } from '../entities/cuota-patente.entity';
import { ImportacionesController } from './importaciones.controller';
import { ImportacionesService } from './importaciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Persona, Patente, CuotaPatente])],
  controllers: [ImportacionesController],
  providers: [ImportacionesService],
})
export class ImportacionesModule {}
