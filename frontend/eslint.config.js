import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import vitestGlobals from 'eslint-plugin-vitest-globals';
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
        ...vitestGlobals.environments.env.globals,
        BUILD_NUMBER: 'readonly',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
