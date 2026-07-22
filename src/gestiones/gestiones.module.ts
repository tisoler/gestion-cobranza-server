import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gestion } from '../entities/gestion.entity';
import { Persona } from '../entities/persona.entity';
import { GestionesService } from './gestiones.service';
import { GestionesController } from './gestiones.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Gestion, Persona]),
    NotificacionesModule,
    UsuariosModule,
  ],
  controllers: [GestionesController],
  providers: [GestionesService],
})
export class GestionesModule {}
