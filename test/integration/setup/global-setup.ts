import { execSync } from 'node:child_process';
import { startContainers } from './containers';

export default async function (): Promise<void> {
  await startContainers();
  // Migrations must be clean and committed — a migrate step is a hard prerequisite.
  execSync(
    'node_modules/.bin/prisma migrate deploy --schema src/infrastructure/persistence/prisma/schema.prisma',
    { env: { ...process.env }, stdio: 'inherit' },
  );
}
