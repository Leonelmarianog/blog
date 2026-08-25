import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { IamModule } from './contexts/iam/presentation/http/iam.module';

// QueueModule is @Global and provides QUEUE_PRODUCER (useClass: LoggingQueueProducer).
// IamModule also binds QUEUE_PRODUCER locally — the local binding shadows the global
// cleanly, and this redundancy is intentional.
@Module({ imports: [ConfigModule, PersistenceModule, CryptoModule, QueueModule, IamModule] })
export class AppModule {}
