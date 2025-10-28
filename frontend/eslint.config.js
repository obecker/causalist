import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginVitestGlobals from 'eslint-plugin-vitest-globals';
import globals from 'globals';

// noinspection JSUnusedGlobalSymbols
export default defineConfig([
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReactHooks.configs.flat.recommended,
  pluginReactRefresh.configs.recommended,
  stylistic.configs.customize({
    semi: true,
    braceStyle: '1tbs',
    arrowParens: true,
  }),
  {
    files: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}', '*.{js,mjs}'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...pluginVitestGlobals.environments.env.globals,
        BUILD_NUMBER: 'readonly',
      },
    },
    plugins: {
      'simple-import-sort': pluginSimpleImportSort,
    },
    rules: {
      'no-duplicate-imports': 'warn',
      'simple-import-sort/imports': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
]);
