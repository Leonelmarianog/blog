import { type AppAction, type AppSubject, type AppSubjectInstance } from '@kernel/domain/authorization/subject';

describe('authorization subject types', () => {
  it('AppSubject covers the baseline resources', () => {
    const subjects: AppSubject[] = ['User', 'Session', 'Profile', 'Post', 'Asset'];
    expect(subjects).toHaveLength(5);
  });

  it('AppAction covers CRUD plus the manage wildcard', () => {
    const actions: AppAction[] = ['read', 'create', 'update', 'delete', 'manage'];
    expect(actions).toHaveLength(5);
  });

  it('AppSubjectInstance carries an id', () => {
    const instance: AppSubjectInstance = { id: 'user-1' };
    expect(instance.id).toBe('user-1');
  });
});
