import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginVitestGlobals from 'eslint-plugin-vitest-globals';
import globals from 'globals';

const pluginReactHooksRecommended = {
  plugins: {
    'react-hooks': pluginReactHooks,
  },
  rules: {
    ...pluginReactHooks.configs.recommended.rules,
  },
};

// noinspection JSUnusedGlobalSymbols
export default [
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReactHooksRecommended,
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
      'react-refresh': pluginReactRefresh,
      'simple-import-sort': pluginSimpleImportSort,
    },
    rules: {
      'no-duplicate-imports': 'warn',
      'simple-import-sort/imports': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
];
