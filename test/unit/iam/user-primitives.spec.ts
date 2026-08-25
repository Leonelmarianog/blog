import { Email } from '@contexts/iam/domain/user/email.vo';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { isRole, ROLES } from '@contexts/iam/domain/authorization/role';
import { isUserStatus } from '@contexts/iam/domain/user/user-status';
import type { Identifier, UserId } from '@contexts/iam/domain/user/user.types';

// Local fixture helper: Email.create returns a Result (discriminated union), so
// .value cannot be accessed without narrowing under ts-jest. (fakes.ts doesn't
// exist yet at this task, so the helper is local.)
function email(value: string): Email {
  const r = Email.create(value);
  if (!r.ok) throw new Error(`fixture: invalid email "${value}"`);
  return r.value;
}

describe('IAM user primitives', () => {
  describe('Email', () => {
    it('creates a valid email and normalizes it', () => {
      const r = Email.create('  Hello@Example.COM  ');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.value).toBe('hello@example.com');
    });

    it('fails on an invalid email', () => {
      expect(Email.create('not-an-email').ok).toBe(false);
      expect(Email.create('a@b').ok).toBe(false);
      expect(Email.create('').ok).toBe(false);
    });

    it('equals by value', () => {
      expect(email('a@b.com').equals(email('a@b.com'))).toBe(true);
      expect(email('a@b.com').equals(email('c@d.com'))).toBe(false);
    });
  });

  describe('HashedPassword', () => {
    it('wraps an existing hash and exposes it', () => {
      const pw = HashedPassword.fromHash('$argon2id$...hash...');
      expect(pw.hash).toBe('$argon2id$...hash...');
    });

    it('equals by hash', () => {
      expect(HashedPassword.fromHash('h1').equals(HashedPassword.fromHash('h1'))).toBe(true);
      expect(HashedPassword.fromHash('h1').equals(HashedPassword.fromHash('h2'))).toBe(false);
    });
  });

  describe('Role / UserStatus', () => {
    it('guards roles', () => {
      expect(ROLES).toEqual(['ADMIN', 'AUTHOR', 'READER']);
      expect(isRole('ADMIN')).toBe(true);
      expect(isRole('SUPERUSER')).toBe(false);
    });

    it('guards user statuses', () => {
      expect(isUserStatus('ACTIVE')).toBe(true);
      expect(isUserStatus('SUSPENDED')).toBe(true);
      expect(isUserStatus('BANNED')).toBe(false);
    });
  });

  it('user.types re-exports Identifier and defines UserId', () => {
    const id = 'u1' as UserId;
    expect(id).toBe('u1');
    // Identifier is usable as a type from this path (boundary regression test relies on it).
    const _: Identifier<'User'> = id;
    expect(_).toBe(id);
  });
});
