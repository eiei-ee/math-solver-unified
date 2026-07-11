/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0A',
        gray: {
          50: '#FAF9F6',
          100: '#F5F3ED',
          200: '#E5E1D8',
          300: '#D0CCC3',
          400: '#AAA69B',
          500: '#817C70',
          600: '#625E54',
          700: '#47443D',
          800: '#302E29',
          900: '#191816',
          950: '#0B0B0A'
        },
        blue: {
          50: '#FFF7E6',
          100: '#FFEDCC',
          200: '#FFDA99',
          300: '#FFC766',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#78350F',
          900: '#451A03',
          950: '#2A1102'
        }
      }
    }
  },
  plugins: []
}
