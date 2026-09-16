import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { StorageHealthIndicator } from './indicators/storage.health-indicator';

/**
 * Health endpoints. The indicators depend on globally-provided providers
 * (`PrismaService` from PersistenceModule, `REDIS_CLIENT` from RedisModule,
 * `STORAGE` from StorageModule) so they are not re-imported here — this module
 * only declares the controller + the three indicator providers.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, StorageHealthIndicator],
})
export class HealthModule {}
