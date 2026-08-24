import { Env } from './env.schema';

export class ConfigService {
  constructor(private readonly env: Env) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }
}
