/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserSubjectResolver } from '@contexts/iam/application/authorization/user-subject-resolver';

describe('UserSubjectResolver', () => {
  const resolver = new UserSubjectResolver();

  it('targets the route param user when :id is present', () => {
    expect(resolver.resolve({ params: { id: 'target' }, session: { userId: 'me' } } as any).id).toBe('target');
  });

  it('falls back to the session user when no :id (own-account routes)', () => {
    expect(resolver.resolve({ session: { userId: 'me' } } as any).id).toBe('me');
  });

  it('exposes the User subject', () => {
    expect(resolver.subject).toBe('User');
  });
});
