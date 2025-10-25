/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'flix-primary': '#8B5CF6',
        'flix-secondary': '#EC4899',
        'flix-dark': '#0F172A',
        'flix-darker': '#020617',
      },
    },
  },
  plugins: [],
}
