export const STORAGE = Symbol('STORAGE');

export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

export type StorageHealth =
  | { ok: true }
  | { ok: false; message: string };

export interface StoragePort {
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
  health(): Promise<StorageHealth>;
}
