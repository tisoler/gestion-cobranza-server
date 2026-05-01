import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Entidad } from './src/entities/entidad.entity';
import { Persona } from './src/entities/persona.entity';
import { TgiUrbano } from './src/entities/tgi-urbano.entity';
import { TgiRural } from './src/entities/tgi-rural.entity';
import { Patente } from './src/entities/patente.entity';
import { Gestion } from './src/entities/gestion.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Entidad, Persona, TgiUrbano, TgiRural, Patente, Gestion],
  migrations: ['./dist/migrations/*.js'],
  synchronize: false,
});
