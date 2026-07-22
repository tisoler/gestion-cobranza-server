import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Entidad } from './entities/entidad.entity';
import { Persona } from './entities/persona.entity';
import { TgiUrbano } from './entities/tgi-urbano.entity';
import { TgiRural } from './entities/tgi-rural.entity';
import { Patente } from './entities/patente.entity';
import { Gestion } from './entities/gestion.entity';
import { CuotaTgiUrbano } from './entities/cuota-tgi-urbano.entity';
import { CuotaTgiRural } from './entities/cuota-tgi-rural.entity';
import { CuotaPatente } from './entities/cuota-patente.entity';
import { PlanPago } from './entities/plan-pago.entity';
import { Notificacion } from './entities/notificacion.entity';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { EntidadesModule } from './entidades/entidades.module';
import { PersonasModule } from './personas/personas.module';
import { GestionesModule } from './gestiones/gestiones.module';
import { PlanesPagoModule } from './planes-pago/planes-pago.module';
import { ImportacionesModule } from './importaciones/importaciones.module';
import { ReportesModule } from './reportes/reportes.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [
          Entidad,
          Persona,
          TgiUrbano,
          TgiRural,
          Patente,
          Gestion,
          CuotaTgiUrbano,
          CuotaTgiRural,
          CuotaPatente,
          PlanPago,
          Notificacion,
        ],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    EntidadesModule,
    PersonasModule,
    GestionesModule,
    PlanesPagoModule,
    ImportacionesModule,
    ReportesModule,
    UsuariosModule,
    NotificacionesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
