import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

let client: S3Client | undefined;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }
  return client;
}

function bucket(): string {
  return process.env.S3_BUCKET ?? '';
}

/** List object keys under a prefix (one page; tests upload < 1000 objects). */
export async function listObjects(prefix: string): Promise<string[]> {
  const res = await s3().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix }));
  return (res.Contents ?? []).map((o) => o.Key ?? '').filter(Boolean);
}

/** Fetch an object's bytes (used to assert the original/variants are really in Garage). */
export async function getObject(key: string): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

/** Best-effort bulk delete of every object under a prefix (used by resetState). */
export async function deletePrefix(prefix: string): Promise<void> {
  const keys = await listObjects(prefix);
  if (keys.length === 0) return;
  await s3().send(
    new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
