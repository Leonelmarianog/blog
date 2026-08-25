export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export const USER_STATUSES: readonly UserStatus[] = ['ACTIVE', 'SUSPENDED'];

export function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}
