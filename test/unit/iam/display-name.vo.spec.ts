import { DisplayName } from '@contexts/iam/domain/user/display-name.vo';

describe('DisplayName', () => {
  it('creates a trimmed non-empty name', () => {
    const r = DisplayName.create('  Ada Lovelace  ');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.value).toBe('Ada Lovelace');
  });

  it('fails on empty/whitespace', () => {
    expect(DisplayName.create('   ').ok).toBe(false);
    expect(DisplayName.create('').ok).toBe(false);
  });

  it('fails over 80 characters', () => {
    expect(DisplayName.create('x'.repeat(81)).ok).toBe(false);
    expect(DisplayName.create('x'.repeat(80)).ok).toBe(true);
  });
});
