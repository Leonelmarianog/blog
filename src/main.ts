import 'dotenv/config'; // Load .env into process.env before ConfigModule parses it
import { createApp } from './create-app';
import { ConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);
  await app.listen(config.get('PORT'));
}

void bootstrap();
