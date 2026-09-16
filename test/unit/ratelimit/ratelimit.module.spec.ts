import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RateLimitModule } from '@infra/ratelimit/ratelimit.module';
import { AppThrottlerGuard } from '@infra/ratelimit/app-throttler.guard';
import { ConfigModule } from '../../../src/config/config.module';

describe('RateLimitModule wiring', () => {
  it('compiles and exposes AppThrottlerGuard as a ThrottlerGuard subclass', async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule, RateLimitModule],
    }).compile();
    const guard = mod.get(AppThrottlerGuard);
    expect(guard).toBeInstanceOf(ThrottlerGuard);
    expect(ThrottlerModule).toBeDefined();
    void APP_GUARD; // referenced for the import; the guard is registered in AppModule, not here
    await mod.close();
  });
});
