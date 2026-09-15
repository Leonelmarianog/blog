import { MongoAbility, AbilityBuilder, createMongoAbility, ForcedSubject } from '@casl/ability';
import type { Role } from '@kernel/domain/authorization/role';
import type { AppAction, AppSubject } from '@kernel/domain/authorization/subject';

type UserSubject = ForcedSubject<'User'> & { id: string };
type AssetSubject = ForcedSubject<'Asset'> & { id: string; ownerId: string };

export type AppAbility = MongoAbility<[AppAction, AppSubject | UserSubject | AssetSubject]>;

export function createAbilityFor(role: Role, userId: string): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Own profile (ownership via conditions)
  can('read', 'User', { id: userId });
  can('update', 'User', { id: userId });

  // Public reads
  can('read', 'Post');
  can('read', 'Asset');

  switch (role) {
    case 'ADMIN':
      can('manage', 'User');
      can('read', 'User');
      can('manage', 'Asset');
      break;
    case 'AUTHOR':
      // Asset ownership: the use-case always sets ownerId = session.userId, so
      // the create subject (sourced from the session by AssetSubjectResolver)
      // matches.
      can('create', 'Asset', { ownerId: userId });
      can('update', 'Asset', { ownerId: userId });
      can('delete', 'Asset', { ownerId: userId });
      break;
    case 'READER':
      break;
  }
  return build();
}
