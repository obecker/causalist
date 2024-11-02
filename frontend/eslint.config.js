import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import stylistic from '@stylistic/eslint-plugin';
import vitestGlobals from 'eslint-plugin-vitest-globals';

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
  pluginJs.configs.recommended,
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
        ...vitestGlobals.environments.env.globals,
        BUILD_NUMBER: 'readonly',
      },
    },
    plugins: {
      'react-refresh': pluginReactRefresh,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
];
