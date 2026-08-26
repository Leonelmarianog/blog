import { MongoAbility, AbilityBuilder, createMongoAbility, ForcedSubject } from '@casl/ability';
import type { Role } from './role';
import type { AppAction, AppSubject } from './subject';

/**
 * Tagged 'User' subject instance. The `__caslSubjectType__` tag lets CASL's
 * `detectSubjectType` recognise a plain `{ id }` object as a 'User', and the
 * `id` field lets ownership conditions (`{ id: userId }`) type-check. Produced
 * at the guard via `subject('User', resolvedInstance)`.
 */
type UserSubject = ForcedSubject<'User'> & { id: string };

export type AppAbility = MongoAbility<[AppAction, AppSubject | UserSubject]>;

/**
 * The single policy module. Pure: same (role, userId) -> same AppAbility.
 * Ownership is expressed as conditions (`{ id: userId }`) that CASL matches
 * against the subject instance's `id` at check time.
 */
export function createAbilityFor(role: Role, userId: string): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Everyone: own profile read/update (ownership via conditions)
  can('read', 'User', { id: userId });
  can('update', 'User', { id: userId });
  // Public reads (placeholders for Plan 6 / blog)
  can('read', ['Post', 'Asset']);

  switch (role) {
    case 'ADMIN':
      can('manage', 'User'); // blanket: any user, any action (no conditions)
      can('read', 'User'); // list users (all)
      break;
    case 'AUTHOR':
      // own-account only (granted above); no user-management
      break;
    case 'READER':
      // own-account only (granted above)
      break;
  }
  return build();
}
