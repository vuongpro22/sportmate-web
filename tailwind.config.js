/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff4d4f',
          hover: '#ff7875',
          light: '#ffb3b3',
          dark: '#d9363e',
        },
        darkBg: '#050505',
        darkCard: '#111111',
        darkBorder: '#222222',
      }
    },
  },
  plugins: [],
}
