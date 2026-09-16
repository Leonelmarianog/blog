import { Injectable, Inject } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { STORAGE, type StoragePort } from '@contexts/media/application/ports/storage.port';

/**
 * Readiness probe for the storage adapter — delegates to `StoragePort.health()` (local =
 * `fs.access`; S3 = `HeadBucket`). See R5 (prisma indicator) for why the result is built by
 * hand rather than via the removed `HealthIndicator` base class.
 */
@Injectable()
export class StorageHealthIndicator {
  constructor(@Inject(STORAGE) private readonly storage: StoragePort) {}

  async check(key: string): Promise<HealthIndicatorResult> {
    const result = await this.storage.health();
    return result.ok
      ? ({ [key]: { status: 'up' } } as HealthIndicatorResult)
      : ({ [key]: { status: 'down', message: result.message } } as HealthIndicatorResult);
  }
}
