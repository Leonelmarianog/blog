import { Injectable, Inject } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { REDIS_CLIENT, type RedisClient } from '@infra/redis/redis.client';

/**
 * Readiness probe for Redis — `PING` and expect `PONG`. See R5 (prisma indicator) for why the
 * result is built by hand rather than via the removed `HealthIndicator` base class.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      if (pong === 'PONG') return { [key]: { status: 'up' } } as HealthIndicatorResult;
      return { [key]: { status: 'down', message: `unexpected ping reply: ${pong}` } } as HealthIndicatorResult;
    } catch (e) {
      return { [key]: { status: 'down', message: (e as Error).message } } as HealthIndicatorResult;
    }
  }
}
