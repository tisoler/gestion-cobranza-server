import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { FirebaseStrategy } from './strategies/firebase.strategy';
import { EntidadesModule } from '../entidades/entidades.module';

@Module({
  imports: [EntidadesModule],
  controllers: [AuthController],
  providers: [FirebaseStrategy],
  exports: [FirebaseStrategy],
})
export class AuthModule {}
