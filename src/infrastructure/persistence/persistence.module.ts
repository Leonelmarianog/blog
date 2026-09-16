import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { EVENT_DISPATCHER, UNIT_OF_WORK } from '@kernel/application';
import { PrismaService } from './prisma/prisma.service';
import { PrismaUnitOfWork } from './unit-of-work';
import { EventDispatcher } from '../events/event-dispatcher';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (config: ConfigService) => new PrismaService(config.get('DATABASE_URL')),
      inject: [ConfigService],
    },
    PrismaUnitOfWork,
    { provide: EVENT_DISPATCHER, useClass: EventDispatcher },
    { provide: UNIT_OF_WORK, useExisting: PrismaUnitOfWork },
  ],
  exports: [PrismaService, PrismaUnitOfWork, EVENT_DISPATCHER, UNIT_OF_WORK],
})
export class PersistenceModule {}
