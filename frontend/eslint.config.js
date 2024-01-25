import globals from 'globals';
import js from '@eslint/js';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import stylistic from '@stylistic/eslint-plugin';

export default [
  js.configs.recommended,
  reactRecommended,
  stylistic.configs.customize({
    'semi': true,
    'braceStyle': '1tbs',
    'arrow-parens': 'always',
  }),
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      // stylistic,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        BUILD_NUMBER: 'readonly',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
