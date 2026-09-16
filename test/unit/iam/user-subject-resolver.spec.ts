/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserSubjectResolver } from '@contexts/iam/application/authorization/user-subject-resolver';
import { SubjectResolverRegistry } from '@kernel/application/authorization/subject-resolver-registry';

describe('UserSubjectResolver', () => {
  const registry = new SubjectResolverRegistry();
  const resolver = new UserSubjectResolver(registry);
  registry.register(resolver);

  it('targets the route param user when :id is present', () => {
    expect(resolver.resolve({ params: { id: 'target' }, session: { userId: 'me' } } as any).id).toBe('target');
  });

  it('falls back to the session user when no :id (own-account routes)', () => {
    expect(resolver.resolve({ session: { userId: 'me' } } as any).id).toBe('me');
  });

  it('exposes the User subject', () => {
    expect(resolver.subject).toBe('User');
  });

  it('self-registers with the registry', () => {
    expect(registry.resolveFor('User', { params: { id: 'x' } } as any)).toEqual({ id: 'x' });
  });
});
