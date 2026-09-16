import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { access, constants } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { StoragePort, StoredObject, StorageHealth } from '@contexts/media/application/ports/storage.port';

export interface LocalDiskAdapterConfig {
  root: string;
  publicBase: string;
}

@Injectable()
export class LocalDiskStorageAdapter implements StoragePort {
  private readonly root: string;
  private readonly publicBase: string;

  constructor(config: LocalDiskAdapterConfig) {
    this.root = config.root;
    this.publicBase = config.publicBase.replace(/\/$/, '');
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    const abs = join(this.root, key);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
    return { key, contentType, size: body.length };
  }

  async delete(key: string): Promise<void> {
    const abs = join(this.root, key);
    if (existsSync(abs)) unlinkSync(abs);
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async health(): Promise<StorageHealth> {
    try {
      await access(this.root, constants.R_OK | constants.W_OK);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }
}
