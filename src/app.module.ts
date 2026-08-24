import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';

@Module({ imports: [ConfigModule, PersistenceModule] })
export class AppModule {}
