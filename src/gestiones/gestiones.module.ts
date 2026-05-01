import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gestion } from '../entities/gestion.entity';
import { GestionesService } from './gestiones.service';
import { GestionesController } from './gestiones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Gestion])],
  controllers: [GestionesController],
  providers: [GestionesService],
})
export class GestionesModule { }
