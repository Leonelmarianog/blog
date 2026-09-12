import { stopContainers } from './containers';

export default async function (): Promise<void> {
  await stopContainers();
}
