/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0B0F19',
          50: '#0D1117',
          100: '#0F1520',
          200: '#131925',
          300: '#171D2A',
          400: '#1B2130',
          500: '#1F2937',
          600: '#242E3E',
          700: '#2A3648',
          800: '#313F52',
          900: '#3A4A5E',
        },
        neon: {
          cyan: '#00F0FF',
          'cyan-dim': '#00B8C5',
          'cyan-glow': '#00F0FF40',
          purple: '#BD00FF',
          'purple-dim': '#9500CC',
          'purple-glow': '#BD00FF40',
          red: '#FF0055',
          'red-dim': '#CC0044',
          'red-glow': '#FF005540',
          green: '#00FF88',
          yellow: '#FFD600',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.3), 0 0 45px rgba(0, 240, 255, 0.1)',
        'neon-purple': '0 0 15px rgba(189, 0, 255, 0.3), 0 0 45px rgba(189, 0, 255, 0.1)',
        'neon-red': '0 0 15px rgba(255, 0, 85, 0.3), 0 0 45px rgba(255, 0, 85, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 3s linear infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'slideUp': 'slideUp 0.5s ease-out forwards',
        'typewriter': 'typewriter 0.05s steps(1) forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2), 0 0 20px rgba(0, 240, 255, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.4), 0 0 60px rgba(0, 240, 255, 0.2)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
