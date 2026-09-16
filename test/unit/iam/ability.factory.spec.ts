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

describe('createAbilityFor — Asset rules', () => {
  it('everyone can read any Asset (public read)', () => {
    for (const role of ['ADMIN', 'AUTHOR', 'READER'] as const) {
      const ability = createAbilityFor(role, ME);
      expect(ability.can('read', 'Asset')).toBe(true);
      expect(ability.can('read', subject('Asset', { id: 'a1', ownerId: OTHER }))).toBe(true);
    }
  });

  it('AUTHOR can create/update/delete own Asset, not another user\'s', () => {
    const ability = createAbilityFor('AUTHOR', ME);
    expect(ability.can('create', subject('Asset', { id: '', ownerId: ME }))).toBe(true);
    expect(ability.can('update', subject('Asset', { id: 'a1', ownerId: ME }))).toBe(true);
    expect(ability.can('delete', subject('Asset', { id: 'a1', ownerId: ME }))).toBe(true);
    expect(ability.can('update', subject('Asset', { id: 'a2', ownerId: OTHER }))).toBe(false);
    expect(ability.can('delete', subject('Asset', { id: 'a2', ownerId: OTHER }))).toBe(false);
  });

  it('READER cannot create/update/delete any Asset', () => {
    const ability = createAbilityFor('READER', ME);
    expect(ability.can('create', subject('Asset', { id: '', ownerId: ME }))).toBe(false);
    expect(ability.can('update', subject('Asset', { id: 'a1', ownerId: ME }))).toBe(false);
  });

  it('ADMIN can manage any Asset', () => {
    const ability = createAbilityFor('ADMIN', ME);
    expect(ability.can('manage', 'Asset')).toBe(true);
    expect(ability.can('delete', subject('Asset', { id: 'a2', ownerId: OTHER }))).toBe(true);
  });
});
