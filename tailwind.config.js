/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#080A0E',
        'card-dark': '#0F1117',
        'card-darker': '#0A0C10',
        accent: {
          DEFAULT: '#00D4FF',
          dark: '#00B3D4',
          glow: 'rgba(0,212,255,0.15)',
        },
        positive: '#00FF94',
        negative: '#FF4D6D',
        amber: '#F59E0B',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        heading: ['Syne', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'card-glow': 'inset 0 0 0 1px rgba(0,212,255,0.2)',
        'card-hover': '0 0 30px rgba(0,212,255,0.08)',
        'glow-accent': '0 0 20px rgba(0,212,255,0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'mesh-shift': 'meshShift 12s ease-in-out infinite',
        'mesh-shift-alt': 'meshShiftAlt 16s ease-in-out infinite',
        'mesh-shift-third': 'meshShiftThird 20s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        meshShift: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%': { transform: 'translate(8%, -6%) scale(1.08)' },
        },
        meshShiftAlt: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%': { transform: 'translate(-10%, 8%) scale(0.93)' },
        },
        meshShiftThird: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '33%': { transform: 'translate(6%, 10%) scale(1.05)' },
          '66%': { transform: 'translate(-8%, -4%) scale(0.96)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
