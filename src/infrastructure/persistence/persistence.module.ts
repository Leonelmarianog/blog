import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { EVENT_DISPATCHER } from '@kernel/application';
import { PrismaService } from './prisma/prisma.service';
import { PrismaUnitOfWork } from './unit-of-work';
import { NoopEventDispatcher } from './noop-event-dispatcher';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (config: ConfigService) => new PrismaService(config.get('DATABASE_URL')),
      inject: [ConfigService],
    },
    PrismaUnitOfWork,
    { provide: EVENT_DISPATCHER, useClass: NoopEventDispatcher },
  ],
  exports: [PrismaService, PrismaUnitOfWork, EVENT_DISPATCHER],
})
export class PersistenceModule {}
