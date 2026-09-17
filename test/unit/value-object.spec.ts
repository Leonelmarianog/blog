import { ValueObject } from '@kernel/domain/value-object';

class Email extends ValueObject<string> {
  static create(value: string): Email {
    return new Email(value);
  }
}

describe('ValueObject', () => {
  it('exposes its value', () => {
    expect(Email.create('a@b.com').value).toBe('a@b.com');
  });

  it('equals by props', () => {
    expect(Email.create('a@b.com').equals(Email.create('a@b.com'))).toBe(true);
    expect(Email.create('a@b.com').equals(Email.create('c@d.com'))).toBe(false);
  });

  it('is reflexively equal to the same instance', () => {
    const e = Email.create('a@b.com');
    expect(e.equals(e)).toBe(true);
  });
});

// Test-only object-backed VO to lock deep-structural equality at the kernel level
// (no coupling to a media-context VO like OriginalFile/Variant).
class PropBag extends ValueObject<{ a: string; b?: number; c: Date | string }> {
  static create(props: { a: string; b?: number; c: Date | string }): PropBag {
    return new PropBag(props);
  }
}

describe('ValueObject deep equality (object-backed props)', () => {
  it('equals regardless of key insertion order', () => {
    const lhs = PropBag.create({ a: 'x', b: 2, c: new Date('2020-01-01T00:00:00.000Z') });
    // Construct with keys inserted in a different order.
    const rhs = PropBag.create({ c: new Date('2020-01-01T00:00:00.000Z'), b: 2, a: 'x' });
    expect(lhs.equals(rhs)).toBe(true);
  });

  it('distinguishes an undefined optional field from an omitted one', () => {
    const withUndef = PropBag.create({ a: 'x', b: undefined, c: new Date('2020-01-01T00:00:00.000Z') });
    const omitted = PropBag.create({ a: 'x', c: new Date('2020-01-01T00:00:00.000Z') });
    // JSON.stringify would serialize both as {"a":"x","c":"..."} and call them equal;
    // isDeepStrictEqual treats a present-but-undefined field as different from an absent one.
    expect(withUndef.equals(omitted)).toBe(false);
  });

  it('distinguishes a Date from an equal-valued ISO string', () => {
    const d = new Date('2020-01-01T00:00:00.000Z');
    const withDate = PropBag.create({ a: 'x', c: d });
    const withString = PropBag.create({ a: 'x', c: '2020-01-01T00:00:00.000Z' });
    // JSON.stringify would render both as the same ISO string; isDeepStrictEqual
    // checks structural type, so Date !== string.
    expect(withDate.equals(withString)).toBe(false);
    expect(withDate.equals(PropBag.create({ a: 'x', c: new Date('2020-01-01T00:00:00.000Z') }))).toBe(true);
  });
});
