/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0c14',
          2: '#111320',
          3: '#181b2a',
        },
        surface: {
          DEFAULT: '#161926',
          2: '#1e2235',
          3: '#252942',
        },
        border: {
          DEFAULT: '#252942',
          2: '#2e334f',
        },
        primary: {
          DEFAULT: '#00d4aa',
          dark: '#00b890',
          light: '#33ddb8',
        },
        accent: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        gain: '#00c896',
        loss: '#ff4d6a',
        warning: '#f7a325',
        text: {
          1: '#e8ecf4',
          2: '#8b91b0',
          3: '#525775',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gain-gradient': 'linear-gradient(135deg, #00c896 0%, #00d4aa 100%)',
        'loss-gradient': 'linear-gradient(135deg, #ff4d6a 0%, #ff6b84 100%)',
        'card-gradient': 'linear-gradient(135deg, #161926 0%, #1e2235 100%)',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(0,212,170,0.15)',
        'glow-sm': '0 0 10px rgba(0,212,170,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        counter: 'counter 1s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
