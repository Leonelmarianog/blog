import { ok, fail, isOk, isFail, DomainError } from '@kernel/domain/result';

class TestError extends DomainError {}

describe('Result', () => {
  it('ok carries a value', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isFail(r)).toBe(false);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it('fail carries an error', () => {
    const r = fail(new TestError('boom'));
    expect(isFail(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (isFail(r)) expect(r.error.message).toBe('boom');
  });
});

describe('DomainError', () => {
  it('preserves the subclass name', () => {
    expect(new TestError('x').name).toBe('TestError');
  });
});