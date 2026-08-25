import { Argon2PasswordHasher } from '@infra/crypto/argon2-password-hasher';
import { Sha256TokenHasher } from '@infra/crypto/sha256-token-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('hashes a password into an argon2id string', async () => {
    const h = await hasher.hash('correct horse');
    expect(h).toMatch(/^\$argon2id\$/);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const h = await hasher.hash('correct horse');
    expect(await hasher.verify('correct horse', h)).toBe(true);
    expect(await hasher.verify('battery staple', h)).toBe(false);
  });

  it('produces a different hash for the same password (random salt)', async () => {
    expect(await hasher.hash('same')).not.toBe(await hasher.hash('same'));
  });
});

describe('Sha256TokenHasher', () => {
  const hasher = new Sha256TokenHasher();

  it('hashes deterministically to a 64-char hex', () => {
    expect(hasher.hash('abc')).toBe(hasher.hash('abc'));
    expect(hasher.hash('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hasher.hash('abc')).not.toBe(hasher.hash('abd'));
  });

  it('verifies a matching value and rejects a mismatch', () => {
    const h = hasher.hash('secret');
    expect(hasher.verify('secret', h)).toBe(true);
    expect(hasher.verify('other', h)).toBe(false);
  });

  it('verify returns false (does not throw) for a malformed hash', () => {
    expect(hasher.verify('secret', 'not-a-real-hash')).toBe(false);
  });
});
