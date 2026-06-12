/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#FDF5F0',
          100: '#FBEEE6',
          200: '#F3D3BD',
          300: '#E9B896',
          400: '#E99A7F',
          500: '#D97757',
          600: '#C4664A',
          700: '#B85C3F',
        },
        clay: {
          50: '#FDFCFB',
          100: '#FAF9F8',
          200: '#F5F3F1',
          300: '#EBE8E4',
          400: '#DCD7D1',
        },
        stone: {
          400: '#A8A29E',
          500: '#8B857F',
          600: '#6B645C',
          700: '#4A443D',
          800: '#2D2824',
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
