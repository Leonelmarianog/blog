import type { HandlebarsHelper } from '../types';

export const helpers: Record<string, HandlebarsHelper> = {
  eq: (a: unknown, b: unknown) => a === b,
  activeNav: (current: unknown, link: unknown) => (current === link ? 'active' : ''),
  formatDate: (d: Date | string) => new Date(d).toLocaleDateString(),
};
