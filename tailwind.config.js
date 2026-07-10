/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        apex: {
          primary: '#1B4D3E',
          secondary: '#FFFFFF',
          accent: '#B8952F',
          warning: '#8B3A50',
          danger: '#6E2C3E',
          background: '#F8F6F2',
        },
        forest: {
          DEFAULT: '#1B4D3E',
          light: '#2A6B55',
          dark: '#123528',
        },
        burgundy: {
          DEFAULT: '#6E2C3E',
          light: '#8B3A50',
          dark: '#4F1F2D',
        },
        gold: {
          DEFAULT: '#B8952F',
          light: '#D4B44A',
          dark: '#967820',
        },
        cream: {
          DEFAULT: '#F8F6F2',
          dark: '#EDE9E1',
        },
        sky: {
          pad: '#E8F4F8',
          light: '#B8D9E8',
          DEFAULT: '#4A8FA8',
          deep: '#2D6B82',
        },
        ink: '#1A1A1A',
        navy: {
          DEFAULT: '#1B4D3E',
          light: '#2A6B55',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(27, 77, 62, 0.12)',
        gold: '0 4px 20px rgba(184, 149, 47, 0.25)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'ken-burns': 'ken-burns 20s ease-in-out infinite',
        'ken-burns-alt': 'ken-burns-alt 22s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'ken-burns': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'ken-burns-alt': {
          '0%, 100%': { transform: 'scale(1.08)' },
          '50%': { transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #F8F6F2 0%, #ffffff 50%, #E8F4F8 100%)',
        'brand-gradient': 'linear-gradient(135deg, #1B4D3E 0%, #2A6B55 50%, #6E2C3E 100%)',
      },
    },
  },
  plugins: [],
};
