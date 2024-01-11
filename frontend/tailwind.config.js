/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,html}'],
  future: {
    hoverOnlyWhenSupported: true
  },
  theme: {
    data: {
      'open': 'open=true',
      'selected': 'selected=true',
    },
    extend: {
      gridTemplateColumns: {
        'cases': '8.3rem 2.75rem 1fr',
        'cases-md': '8.3rem 2.75rem 1fr 6rem',
        'cases-lg': '8.3rem 2.75rem 3fr 1fr 6rem 6rem',
      },
      keyframes: {
        updated: {
          '0%,100%': {},
          '50%': { 'background-color': '#0f766e' }, // teal-700
        }
      },
      animation: {
        updated: 'updated 2s cubic-bezier(0.4, 0, 1, 1) 500ms'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@headlessui/tailwindcss')
  ],
}
