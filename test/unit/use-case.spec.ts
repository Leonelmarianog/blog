import { UseCase, ok, fail } from '@kernel/application/use-case.base';
import { DomainError } from '@kernel/domain/result';

class Empty extends DomainError {}

class Echo extends UseCase<string, string> {
  async execute(input: string) {
    return input.length > 0 ? ok(input) : fail(new Empty('empty input'));
  }
}

describe('UseCase', () => {
  it('returns an ok Result', async () => {
    const r = await new Echo().execute('hi');
    expect(r.ok).toBe(true);
  });

  it('returns a fail Result', async () => {
    const r = await new Echo().execute('');
    expect(r.ok).toBe(false);
  });
});
