import { StorageHealthIndicator } from '@bootstrap/health/indicators/storage.health-indicator';

describe('StorageHealthIndicator', () => {
  it('reports up when storage.health() is ok', async () => {
    const storage = { health: jest.fn().mockResolvedValue({ ok: true }) } as never;
    const indicator = new StorageHealthIndicator(storage);
    await expect(indicator.check('storage')).resolves.toEqual({ storage: { status: 'up' } });
  });

  it('reports down with a message when storage.health() is not ok', async () => {
    const storage = { health: jest.fn().mockResolvedValue({ ok: false, message: 'ENOENT' }) } as never;
    const indicator = new StorageHealthIndicator(storage);
    const result = await indicator.check('storage');
    expect(result.storage.status).toBe('down');
    expect(result.storage.message).toBe('ENOENT');
  });
});
