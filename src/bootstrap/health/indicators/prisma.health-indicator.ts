import { Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import type { PrismaService } from '@infra/persistence/prisma/prisma.service';

/**
 * Readiness probe for Postgres via Prisma. Runs `SELECT 1` and reports `up`/`down`.
 * The result object is built by hand (see R5): terminus v12 dropped the `HealthIndicator`
 * base class + `getStatus()` the plan assumed, and `HealthCheckService.check([...])` only
 * aggregates the returned `HealthIndicatorResult` objects — it does not require indicators to
 * use `HealthIndicatorService`. This keeps `check(key)` a thin, single-dependency wrapper.
 */
@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { [key]: { status: 'up' } } as HealthIndicatorResult;
    } catch (e) {
      return { [key]: { status: 'down', message: (e as Error).message } } as HealthIndicatorResult;
    }
  }
}
