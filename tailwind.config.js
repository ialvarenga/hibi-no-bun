/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EFE9DC', // washi cream
        'paper-line': '#D9D0BC',
        ink: '#1C1C1C',
        'ink-soft': '#5B5648',
        indigo: {
          DEFAULT: '#223A5E',
          soft: '#3E5878',
        },
        vermillion: '#C1432E', // hanko red
        moss: '#6B7A5E',
        card: '#FBF8F1',
      },
      fontFamily: {
        display: ["'Shippori Mincho'", 'serif'],
        body: ["'Zen Kaku Gothic New'", "'Noto Sans JP'", 'sans-serif'],
      },
    },
  },
  plugins: [],
}
