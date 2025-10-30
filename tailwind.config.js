/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'flix-cyan': '#14F195', // Solana green
        'flix-dark': '#0A0A0F', // Deep purple/black
        'flix-gray': '#1A1A2E', // Dark purple
        'flix-light-gray': '#16213E', // Medium purple
        'flix-text': '#FFFFFF',
        'flix-text-secondary': '#AAAAAA',
        'solana-purple': '#9945FF', // Solana main purple
        'solana-purple-dark': '#7735D4', // Darker purple
        'solana-green': '#14F195', // Solana green
        'solana-blue': '#00D4FF', // Solana blue accent
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'flix': '0 4px 20px rgba(153, 69, 255, 0.15)',
      },
      backgroundImage: {
        'solana-gradient': 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
        'solana-gradient-dark': 'linear-gradient(135deg, #7735D4 0%, #00D4FF 100%)',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
}
