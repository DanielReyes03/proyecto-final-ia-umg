/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#0f0f0f',
        sidebar: '#1a1a1a',
        surface: '#242424',
        accent: '#3b82f6',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
