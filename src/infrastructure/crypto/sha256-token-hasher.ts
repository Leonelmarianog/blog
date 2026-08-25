import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { TokenHasherPort } from '@contexts/iam/application/ports/token-hasher.port';

@Injectable()
export class Sha256TokenHasher implements TokenHasherPort {
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  verify(value: string, hash: string): boolean {
    const computed = this.hash(value);
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(hash, 'utf8');
    // timingSafeEqual requires equal-length buffers; a malformed hash has a
    // different length, so guard with the length check (returns false, no throw).
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
