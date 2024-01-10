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
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@headlessui/tailwindcss')
  ],
}
