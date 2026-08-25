import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';

@Module({ imports: [ConfigModule, PersistenceModule, CryptoModule] })
export class AppModule {}
