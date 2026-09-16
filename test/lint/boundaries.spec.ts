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
      { type: 'composition-root', pattern: 'src/create-app.ts' },
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
          { from: 'kernel-application-port', allow: ['kernel-domain', 'kernel-application-port'] },
          { from: 'kernel-application', allow: ['kernel-domain', 'kernel-application', 'kernel-application-port'] },
          { from: 'kernel-presentation', allow: ['kernel-application', 'kernel-presentation'] },
          { from: 'context-domain', allow: ['kernel-domain', 'context-domain'] },
          { from: 'context-application-port', allow: ['context-domain', 'kernel-domain', 'context-application-port'] },
          { from: 'context-application', allow: ['context-domain', 'kernel-domain', 'kernel-application', 'context-application', 'context-application-port'] },
          { from: 'context-presentation', allow: ['context-application', 'context-presentation', 'kernel-application'] },
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

  it('allows context-presentation (controller) -> kernel-application (PoliciesGuard)', () => {
    const code = `import { PoliciesGuard } from '@kernel/application/authorization/policies.guard';\nexport class C { constructor(g: PoliciesGuard) {} }`;
    const messages = lintFixture('src/contexts/iam/presentation/http/controllers/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows context-presentation (controller) -> context-domain (aggregate) directly', () => {
    const code = `import { User } from '@contexts/iam/domain/user/user.aggregate';\nexport const u = () => User;`;
    const messages = lintFixture('src/contexts/iam/presentation/http/controllers/foo.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  // --- Authorization hoist ---

  it('allows context-domain (User aggregate) -> kernel-domain (Role)', () => {
    const code = `import type { Role } from '@kernel/domain/authorization/role';\nexport class U { constructor(readonly role: Role) {} }`;
    const messages = lintFixture('src/contexts/iam/domain/user/user.aggregate.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows context-domain (User aggregate) -> kernel-application (authz machinery)', () => {
    const code = `import { AbilityService } from '@kernel/application/authorization/ability.service';\nexport class U { constructor(readonly a: AbilityService) {} }`;
    const messages = lintFixture('src/contexts/iam/domain/user/user.aggregate.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('allows context-presentation (ChangeRoleDto) -> context-application (IAM authz shim barrel)', () => {
    const code = `import { ROLES } from '@contexts/iam/application/authorization';\nexport class D { r = ROLES; }`;
    const messages = lintFixture('src/contexts/iam/presentation/http/dto/change-role.dto.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows context-presentation (ChangeRoleDto) -> kernel-domain (Role) directly', () => {
    const code = `import { ROLES } from '@kernel/domain/authorization/role';\nexport class D { r = ROLES; }`;
    const messages = lintFixture('src/contexts/iam/presentation/http/dto/change-role.dto.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('allows kernel-application (ability.factory) -> kernel-domain (AppSubject)', () => {
    const code = `import type { AppSubject } from '@kernel/domain/authorization/subject';\nexport type A = AppSubject;`;
    const messages = lintFixture('src/shared-kernel/application/authorization/ability.factory.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  // --- contexts/media layering ---

  it('allows media context-domain (asset) -> kernel-domain', () => {
    const code = `import { Identifier } from '@kernel/domain';\nexport type A = Identifier<'Asset'>;`;
    const messages = lintFixture('src/contexts/media/domain/asset/asset.types.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows media context-domain (asset) -> context-application', () => {
    const code = `import { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';\nexport const x = UploadAssetUseCase;`;
    const messages = lintFixture('src/contexts/media/domain/asset/asset.aggregate.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('allows media context-application (use-case) -> media domain + kernel-application', () => {
    const code = `import { Asset } from '../domain/asset/asset.aggregate';\nimport { UnitOfWorkPort } from '@kernel/application';\nexport class U { constructor(a: typeof Asset, u: UnitOfWorkPort<unknown>) {} }`;
    const messages = lintFixture('src/contexts/media/application/commands/upload-asset.use-case.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows media context-application (resolver) -> kernel-application (registry)', () => {
    const code = `import { SubjectResolverRegistry } from '@kernel/application/authorization/subject-resolver-registry';\nexport class R { constructor(reg: SubjectResolverRegistry) {} }`;
    const messages = lintFixture('src/contexts/media/application/authorization/asset-subject-resolver.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows media context-presentation (controller) -> media application + kernel-application', () => {
    const code = `import { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';\nimport { PoliciesGuard } from '@kernel/application/authorization/policies.guard';\nexport class C { constructor(u: UploadAssetUseCase, g: PoliciesGuard) {} }`;
    const messages = lintFixture('src/contexts/media/presentation/http/controllers/media.controller.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows media context-presentation (controller) -> media context-domain', () => {
    const code = `import { Asset } from '@contexts/media/domain/asset/asset.aggregate';\nexport const x = Asset;`;
    const messages = lintFixture('src/contexts/media/presentation/http/controllers/media.controller.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });

  it('allows media context-composition (media.module) -> infrastructure + media application', () => {
    const code = `import { PrismaAssetRepository } from '@infra/persistence/repositories/asset.repository';\nimport { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';\nexport const x = [PrismaAssetRepository, UploadAssetUseCase];`;
    const messages = lintFixture('src/contexts/media/presentation/http/media.module.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('allows infrastructure (storage) -> media context-application port', () => {
    const code = `import type { StoragePort } from '@contexts/media/application/ports/storage.port';\nexport type S = StoragePort;`;
    const messages = lintFixture('src/infrastructure/storage/s3.storage-adapter.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(false);
  });

  it('disallows infrastructure (storage) -> media context-application (use-case)', () => {
    const code = `import { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';\nexport const x = UploadAssetUseCase;`;
    const messages = lintFixture('src/infrastructure/storage/s3.storage-adapter.ts', code);
    expect(messages.some((m) => m.ruleId === 'boundaries/element-types')).toBe(true);
  });
});
