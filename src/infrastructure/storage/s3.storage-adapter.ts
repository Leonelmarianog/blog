import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { StoragePort, StoredObject, StorageHealth } from '@contexts/media/application/ports/storage.port';

export interface S3AdapterConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBase: string;
  forcePathStyle: boolean;
}

@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(config: S3AdapterConfig, client?: S3Client) {
    this.bucket = config.bucket;
    this.publicBase = config.publicBase.replace(/\/$/, '');
    this.client = client ?? new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
    return { key, contentType, size: body.length };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async health(): Promise<StorageHealth> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
