/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0d0f13',
          sidebar: '#11141a',
          card: '#161a22',
          node: '#151922',
          inner: '#0f1218'
        }
      }
    },
  },
  plugins: [],
}
