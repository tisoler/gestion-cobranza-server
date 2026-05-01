import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanPago } from '../entities/plan-pago.entity';
import { PlanesPagoService } from './planes-pago.service';
import { PlanesPagoController } from './planes-pago.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlanPago])],
  controllers: [PlanesPagoController],
  providers: [PlanesPagoService],
  exports: [PlanesPagoService],
})
export class PlanesPagoModule {}
