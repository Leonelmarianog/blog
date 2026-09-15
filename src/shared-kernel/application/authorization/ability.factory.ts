import { MongoAbility, AbilityBuilder, createMongoAbility, ForcedSubject } from '@casl/ability';
import type { Role } from '@kernel/domain/authorization/role';
import type { AppAction, AppSubject } from '@kernel/domain/authorization/subject';

type UserSubject = ForcedSubject<'User'> & { id: string };

export type AppAbility = MongoAbility<[AppAction, AppSubject | UserSubject]>;

export function createAbilityFor(role: Role, userId: string): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can('read', 'User', { id: userId });
  can('update', 'User', { id: userId });
  can('read', ['Post', 'Asset']);

  switch (role) {
    case 'ADMIN':
      can('manage', 'User');
      can('read', 'User');
      break;
    case 'AUTHOR':
      break;
    case 'READER':
      break;
  }
  return build();
}
