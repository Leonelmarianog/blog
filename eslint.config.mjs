import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/', 'src/infrastructure/persistence/prisma/generated/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node CommonJS config files (e.g. jest.config.js) need Node globals + CommonJS source.
    files: ['jest.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    settings: {
      // The boundaries plugin uses eslint-module-utils/resolve to map an import string to a
      // file path before classifying the target as an element. By default the node resolver
      // only tries .js/.json/.node, so TypeScript relative imports (e.g. `../application/use-case.base`)
      // don't resolve and element-types rules never fire. Adding .ts to the node resolver's
      // extensions fixes this without an extra dependency.
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'] },
      },
      'boundaries/elements': [
        { type: 'kernel-domain', pattern: 'src/shared-kernel/domain/**' },
        { type: 'kernel-application', pattern: 'src/shared-kernel/application/**' },
        { type: 'kernel-presentation', pattern: 'src/shared-kernel/presentation/**' },
        { type: 'context-domain', pattern: 'src/contexts/*/domain/**' },
        { type: 'context-application', pattern: 'src/contexts/*/application/**' },
        { type: 'context-presentation', pattern: 'src/contexts/*/presentation/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
      ],
    },
    plugins: { boundaries },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          // Unrecognized dependencies (external packages, composition-root files) are allowed;
          // recognized-but-not-allowed dependencies are disallowed. Direction is enforced
          // by the explicit allow-lists below.
          //
          // Note: `default: 'disallow'` is required for the allow-lists to be authoritative.
          // The plugin only evaluates dependencies whose target is a recognized local element,
          // so external packages and unrecognized local files (composition-root) remain allowed
          // regardless. Each element type includes itself in its `allow` list so same-type
          // dependencies are permitted (the brief's `allowSameType: true` intent — that property
          // does not exist in eslint-plugin-boundaries v5, which rejects unknown properties).
          default: 'disallow',
          rules: [
            { from: 'kernel-domain', allow: ['kernel-domain'] },
            { from: 'kernel-application', allow: ['kernel-domain', 'kernel-application'] },
            { from: 'kernel-presentation', allow: ['kernel-application', 'kernel-presentation'] },
            { from: 'context-domain', allow: ['kernel-domain', 'context-domain'] },
            {
              from: 'context-application',
              allow: ['context-domain', 'kernel-domain', 'kernel-application', 'context-application'],
            },
            { from: 'context-presentation', allow: ['context-application', 'context-presentation'] },
            { from: 'infrastructure', allow: ['context-application', 'infrastructure'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared-kernel/domain/**', 'src/contexts/*/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'express'],
              message: 'Domain layer must stay framework-agnostic (no NestJS/express).',
            },
          ],
        },
      ],
    },
  },
];
