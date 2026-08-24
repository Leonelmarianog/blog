import { Mapper } from '@infra/persistence/mapper.base';

interface UserDomain {
  id: string;
  email: string;
}
interface UserRow {
  id: string;
  email_address: string;
}

class UserMapper extends Mapper<UserDomain, UserRow> {
  toPersistence(domain: UserDomain): UserRow {
    return { id: domain.id, email_address: domain.email };
  }
  toDomain(row: UserRow): UserDomain {
    return { id: row.id, email: row.email_address };
  }
}

describe('Mapper', () => {
  const mapper = new UserMapper();

  it('maps domain to persistence', () => {
    expect(mapper.toPersistence({ id: '1', email: 'a@b.com' })).toEqual({
      id: '1',
      email_address: 'a@b.com',
    });
  });

  it('maps persistence to domain', () => {
    expect(mapper.toDomain({ id: '1', email_address: 'a@b.com' })).toEqual({
      id: '1',
      email: 'a@b.com',
    });
  });

  it('round-trips domain -> persistence -> domain', () => {
    const domain = { id: '1', email: 'a@b.com' };
    expect(mapper.toDomain(mapper.toPersistence(domain))).toEqual(domain);
  });
});
