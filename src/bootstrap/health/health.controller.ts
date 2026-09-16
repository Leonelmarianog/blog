import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';
import { StorageHealthIndicator } from './indicators/storage.health-indicator';

/**
 * Liveness (`GET /health`) and readiness (`GET /health/ready`) endpoints.
 *
 * Liveness reports process uptime only — a failing dependency must NOT take liveness
 * down (the orchestrator restarts on liveness failure, which would make an upstream
 * DB outage worse). Readiness aggregates the three indicators via `HealthCheckService`;
 * the `@HealthCheck()` decorator wraps thrown errors into a 503 `HealthCheckError`.
 * The indicators build their `HealthIndicatorResult` by hand (see R5), and
 * `HealthCheckService.check([...])` only aggregates those results.
 */
@Controller('health')
@SkipThrottle({ default: true, 'login-ip': true, 'login-email': true, register: true, 'resend-verification': true, 'resend-reset': true, 'reset-submit': true })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly storage: StorageHealthIndicator,
  ) {}

  /** Liveness — no dependency checks; a failing DB must not crash liveness. */
  @Get()
  liveness() {
    return { status: 'ok', info: { uptime: process.uptime() } };
  }

  /** Readiness — all three deps must be up. */
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prisma.check('database'),
      () => this.redis.check('redis'),
      () => this.storage.check('storage'),
    ]);
  }
}
