export type Role = 'ADMIN' | 'AUTHOR' | 'READER';

export const ROLES: readonly Role[] = ['ADMIN', 'AUTHOR', 'READER'];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
