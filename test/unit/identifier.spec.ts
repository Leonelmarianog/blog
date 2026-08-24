import { Identifier } from '@kernel/domain/identifier';

describe('Identifier', () => {
  it('generates a uuid string', () => {
    const id = Identifier.generate<'UserId'>();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('wraps an existing string value', () => {
    const id = Identifier.from<'UserId'>('existing-id');
    expect(id).toBe('existing-id');
  });

  it('throws on empty or blank values', () => {
    expect(() => Identifier.from<'UserId'>('')).toThrow();
    expect(() => Identifier.from<'UserId'>('   ')).toThrow();
  });

  it('compares by value', () => {
    const a = Identifier.from<'UserId'>('same');
    const b = Identifier.from<'UserId'>('same');
    const c = Identifier.from<'UserId'>('other');
    expect(Identifier.equals(a, b)).toBe(true);
    expect(Identifier.equals(a, c)).toBe(false);
  });
});