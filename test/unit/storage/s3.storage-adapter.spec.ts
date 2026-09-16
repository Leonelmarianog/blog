import { S3StorageAdapter } from '@infra/storage/s3.storage-adapter';

function mockS3Client() {
  const sent: { Command: unknown; input: unknown }[] = [];
  const client = {
    send: jest.fn(async (cmd: { input: unknown }) => {
      sent.push({ Command: cmd.constructor, input: cmd.input });
      return {};
    }),
  };
  return { client, sent };
}

describe('S3StorageAdapter', () => {
  it('put sends a PutObjectCommand and returns the stored object', async () => {
    const { client, sent } = mockS3Client();
    const adapter = new S3StorageAdapter({
      endpoint: 'http://s3.local', region: 'us-east-1', bucket: 'media',
      accessKeyId: 'k', secretAccessKey: 's', publicBase: 'http://cdn/media', forcePathStyle: true,
    }, client as never);
    const stored = await adapter.put('assets/a/original.png', Buffer.from('x'), 'image/png');
    expect(stored.size).toBe(1);
    expect(sent).toHaveLength(1);
    expect((sent[0].input as { Key: string }).Key).toBe('assets/a/original.png');
  });

  it('delete sends a DeleteObjectCommand', async () => {
    const { client, sent } = mockS3Client();
    const adapter = new S3StorageAdapter({
      endpoint: 'http://s3.local', region: 'us-east-1', bucket: 'media',
      accessKeyId: 'k', secretAccessKey: 's', publicBase: 'http://cdn/media', forcePathStyle: true,
    }, client as never);
    await adapter.delete('assets/a/original.png');
    expect(sent).toHaveLength(1);
  });

  it('publicUrl joins the public base and key', () => {
    const { client } = mockS3Client();
    const adapter = new S3StorageAdapter({
      endpoint: 'http://s3.local', region: 'us-east-1', bucket: 'media',
      accessKeyId: 'k', secretAccessKey: 's', publicBase: 'http://cdn/media', forcePathStyle: true,
    }, client as never);
    expect(adapter.publicUrl('assets/a/original.png')).toBe('http://cdn/media/assets/a/original.png');
  });

  it('health sends a HeadBucketCommand and reports ok', async () => {
    const { client, sent } = mockS3Client();
    const adapter = new S3StorageAdapter({
      endpoint: 'http://s3.local', region: 'us-east-1', bucket: 'media',
      accessKeyId: 'k', secretAccessKey: 's', publicBase: 'http://cdn/media', forcePathStyle: true,
    }, client as never);
    await expect(adapter.health()).resolves.toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect((sent[0].Command as { name: string }).name).toBe('HeadBucketCommand');
  });

  it('health reports down when HeadBucket throws', async () => {
    const { client } = mockS3Client();
    (client.send as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const adapter = new S3StorageAdapter({
      endpoint: 'http://s3.local', region: 'us-east-1', bucket: 'media',
      accessKeyId: 'k', secretAccessKey: 's', publicBase: 'http://cdn/media', forcePathStyle: true,
    }, client as never);
    const result = await adapter.health();
    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toBe('boom');
  });
});
