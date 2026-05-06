// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/** Files that are not part of the TypeScript project and need different treatment */
const NON_TS_PROJECT_FILES = ['vitest.config.ts', 'eslint.config.js', 'scripts/**/*.mjs', 'tests/**/*.ts'];

export default [
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Node.js globals for scripts and test files
  {
    files: NON_TS_PROJECT_FILES,
    languageOptions: {
      globals: globals.node,
    },
  },
  // Disable type-aware rules for files outside the TS project
  {
    files: NON_TS_PROJECT_FILES,
    languageOptions: {
      parserOptions: { project: false },
    },
    ...tseslint.configs.disableTypeChecked,
  },
];
