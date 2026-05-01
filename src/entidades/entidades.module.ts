import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entidad } from '../entities/entidad.entity';
import { EntidadesService } from './entidades.service';
import { EntidadesController } from './entidades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Entidad])],
  controllers: [EntidadesController],
  providers: [EntidadesService],
  exports: [EntidadesService],
})
export class EntidadesModule {}
