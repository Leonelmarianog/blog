import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { parseEnv } from './env';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => new ConfigService(parseEnv()),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
