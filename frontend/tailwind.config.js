import headlessPlugin from '@headlessui/tailwindcss';
import formsPlugin from '@tailwindcss/forms';
import defaultTheme from 'tailwindcss/defaultTheme';

// noinspection JSUnusedGlobalSymbols
export default {
  content: ['./src/**/*.{js,jsx,html}'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    data: {
      open: 'open=true',
      selected: 'selected=true',
      // for headless UI transitions
      closed: 'closed',
      enter: 'enter',
      leave: 'leave',
    },
    extend: {
      animation: {
        'updated': 'updated 1s cubic-bezier(0.4, 0, 1, 1) 500ms',
        'spin-slow': 'spin 8s linear infinite',
      },
      fontFamily: {
        sans: ['Cabin', ...defaultTheme.fontFamily.sans],
      },
      gridTemplateColumns: {
        'cases': '8.9rem 2.75rem 1fr',
        'cases-md': '8.9rem 2.75rem 1fr 6rem',
        'cases-lg': '8.9rem 2.75rem 3fr 2fr 6rem 6rem',
      },
      keyframes: {
        updated: {
          '0%,100%': {},
          '50%': { 'background-color': '#0f766e' }, // teal-700
        },
      },
    },
    fontFamily: {
      cabin: ['Cabin', 'sans-serif'],
      kaushanScript: ['KaushanScript'],
    },
  },
  plugins: [
    formsPlugin,
    headlessPlugin,
  ],
};
