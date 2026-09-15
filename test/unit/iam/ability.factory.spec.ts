import { subject } from '@casl/ability';
import { createAbilityFor } from '@kernel/application/authorization/ability.factory';

const ME = 'user-1';
const OTHER = 'user-2';

describe('createAbilityFor', () => {
  it('ADMIN can manage any User (no conditions)', () => {
    const ability = createAbilityFor('ADMIN', ME);
    expect(ability.can('manage', 'User')).toBe(true);
    expect(ability.can('update', subject('User', { id: OTHER }))).toBe(true);
    expect(ability.can('read', 'User')).toBe(true);
  });

  it('AUTHOR can update/read own profile, but NOT another user', () => {
    const ability = createAbilityFor('AUTHOR', ME);
    expect(ability.can('update', subject('User', { id: ME }))).toBe(true);
    expect(ability.can('read', subject('User', { id: ME }))).toBe(true);
    expect(ability.can('update', subject('User', { id: OTHER }))).toBe(false);
    expect(ability.can('read', subject('User', { id: OTHER }))).toBe(false);
    expect(ability.can('manage', 'User')).toBe(false);
  });

  it('READER can update/read own profile, but NOT manage or touch others', () => {
    const ability = createAbilityFor('READER', ME);
    expect(ability.can('update', subject('User', { id: ME }))).toBe(true);
    expect(ability.can('read', subject('User', { id: ME }))).toBe(true);
    expect(ability.can('update', subject('User', { id: OTHER }))).toBe(false);
    expect(ability.can('read', subject('User', { id: OTHER }))).toBe(false);
    expect(ability.can('manage', 'User')).toBe(false);
  });

  it('everyone can read Post and Asset (public reads)', () => {
    for (const role of ['ADMIN', 'AUTHOR', 'READER'] as const) {
      const ability = createAbilityFor(role, ME);
      expect(ability.can('read', 'Post')).toBe(true);
      expect(ability.can('read', 'Asset')).toBe(true);
      expect(ability.can('update', 'Post')).toBe(false);
    }
  });
});
