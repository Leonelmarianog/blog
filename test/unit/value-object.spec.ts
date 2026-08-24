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
