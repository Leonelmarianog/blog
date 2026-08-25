import { Linter } from 'eslint';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import path from 'node:path';

const linter = new Linter();

// NOTE: the element types, rules, and import/resolver (typescript + node) here are
// mirrored in eslint.config.mjs. Keep them in sync when editing. The config is
// expressed in ESLint v9 flat config form (languageOptions.parser, files: ['**'])
// so the Linter API can classify both the source filename and the resolved import
// target — the typescript resolver maps @kernel/* / @contexts/* / @infra/* aliases
// to real src/** paths via tsconfig.json so alias imports are classified too.
const config = {
  files: ['**'],
  plugins: { boundaries },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { sourceType: 'module' },
  },
  settings: {
    'import/resolver': {
      typescript: { project: path.resolve('tsconfig.json'), extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
      node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
    },
    'boundaries/elements': [
      { type: 'composition-root', pattern: 'src/main.ts' },
      { type: 'composition-root', pattern: 'src/app.module.ts' },
      { type: 'kernel-domain', pattern: 'src/shared-kernel/domain/**' },
      // Port types must be listed before their parent application type so that
      // src/.../application/ports/** files are classified as the more specific
      // *-port element (the first matching pattern wins in eslint-plugin-boundaries).
      { type: 'kernel-application-port', pattern: 'src/shared-kernel/application/ports/**' },
      { type: 'kernel-application', pattern: 'src/shared-kernel/application/**' },
      { type: 'kernel-presentation', pattern: 'src/shared-kernel/presentation/**' },
      { type: 'context-domain', pattern: 'src/contexts/*/domain/**' },
      { type: 'context-application-port', pattern: 'src/contexts/*/application/ports/**' },
      { type: 'context-application', pattern: 'src/contexts/*/application/**' },
      { type: 'context-composition', pattern: 'src/contexts/*/presentation/http/*.module.ts', mode: 'file' },
      { type: 'context-presentation', pattern: 'src/contexts/*/presentation/**' },
      { type: 'infrastructure', pattern: 'src/infrastructure/**' },
    ],
  },
  rules: {
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'composition-root', allow: ['composition-root', 'kernel-domain', 'kernel-application', 'kernel-presentation', 'context-domain', 'context-application', 'context-presentation', 'infrastructure'] },
          { from: 'kernel-domain', allow: ['kernel-domain'] },
          { from: 'kernel-application-port', allow: ['kernel-domain', 'kernel-application', 'kernel-application-port'] },
          { from: 'kernel-application', allow: ['kernel-domain', 'kernel-application', 'kernel-application-port'] },
          { from: 'kernel-presentation', allow: ['kernel-application', 'kernel-presentation'] },
          { from: 'context-domain', allow: ['kernel-domain', 'context-domain'] },
          { from: 'context-application-port', allow: ['context-domain', 'kernel-domain', 'kernel-application', 'context-application', 'context-application-port'] },
          { from: 'context-application', allow: ['context-domain', 'kernel-domain', 'kernel-application', 'context-application', 'context-application-port'] },
          { from: 'context-presentation', allow: ['context-application', 'context-presentation'] },
          { from: 'context-composition', allow: ['context-composition', 'kernel-domain', 'context-domain', 'kernel-application', 'kernel-application-port', 'context-application', 'context-application-port', 'context-presentation', 'infrastructure'] },
          { from: 'infrastructure', allow: ['kernel-domain', 'context-domain', 'kernel-application', 'kernel-application-port', 'context-application-port', 'infrastructure'] },
        ],
      },
    ],
  },
};

// Each fixture filename is chosen to match the `from` element's src/** pattern
// (so the source is classified) and to place the relative import at the right
// depth to resolve into src/** (so the target is classified). The on-disk
// fixture files under test/lint/fixtures/ mirror these snippets for
// documentation but are git-ignored from linting.
function lintFixture(filename: string, code: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return linter.verify(code, [config] as any, path.resolve(filename));
}

describe('boundary rules', () => {
  it('allows infrastructure -> context-domain', () => {
    const code = `import type { Identifier } from '../../contexts/iam/domain/user/user.types';\nexport type X = Identifier<'User'>;`;
    const messages = lintFixture('src/infrastructure/persistence/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows kernel-domain -> kernel-application', () => {
    const code = `import { UseCase } from '../application/use-case.base';\nexport class Bad extends UseCase<never, never> { async execute() { return { ok: true, value: undefined as never }; } }`;
    const messages = lintFixture('src/shared-kernel/domain/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('allows infrastructure -> kernel-application port', () => {
    const code = `import type { UnitOfWorkPort } from '../../shared-kernel/application/ports/unit-of-work.port';\nexport type UoW = UnitOfWorkPort<unknown>;`;
    const messages = lintFixture('src/infrastructure/persistence/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows infrastructure -> context-application port', () => {
    const code = `import type { PasswordHasherPort } from '@contexts/iam/application/ports/password-hasher.port';\nexport type P = PasswordHasherPort;`;
    const messages = lintFixture('src/infrastructure/crypto/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows context-application -> context-application port (service imports its own port)', () => {
    const code = `import type { PasswordHasherPort } from '@contexts/iam/application/ports/password-hasher.port';\nexport type P = PasswordHasherPort;`;
    const messages = lintFixture('src/contexts/iam/application/services/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows kernel-application -> kernel-application port', () => {
    const code = `import type { UnitOfWorkPort } from './ports/unit-of-work.port';\nexport type UoW = UnitOfWorkPort<unknown>;`;
    const messages = lintFixture('src/shared-kernel/application/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows composition-root -> infrastructure', () => {
    const code = `import { PersistenceModule } from './infrastructure/persistence/persistence.module';\nexport const m = PersistenceModule;`;
    const messages = lintFixture('src/app.module.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  // Alias imports (@kernel/*, @contexts/*, @infra/*) are the dominant cross-layer import
  // style in src/. These cases prove the typescript resolver maps them to real src/** paths
  // so boundaries/element-types classifies and enforces them — closing the gap where a
  // disallowed alias import previously passed lint silently.
  it('allows infrastructure -> context-domain via @contexts alias', () => {
    const code = `import type { Identifier } from '@contexts/iam/domain/user/user.types';\nexport type X = Identifier<'User'>;`;
    const messages = lintFixture('src/infrastructure/persistence/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows infrastructure -> kernel-application via @kernel alias', () => {
    const code = `import type { UnitOfWorkPort } from '@kernel/application';\nexport type UoW = UnitOfWorkPort<unknown>;`;
    const messages = lintFixture('src/infrastructure/persistence/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows context-composition -> infrastructure', () => {
    const code = `import { PrismaUserRepository } from '@infra/persistence/repositories/user.repository';\nexport const x = PrismaUserRepository;`;
    const messages = lintFixture('src/contexts/iam/presentation/http/iam.module.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows context-presentation -> infrastructure', () => {
    const code = `import { PrismaUserRepository } from '@infra/persistence/repositories/user.repository';\nexport const x = PrismaUserRepository;`;
    const messages = lintFixture('src/contexts/iam/presentation/http/controllers/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });
});
