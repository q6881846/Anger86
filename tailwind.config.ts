import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          deep: '#0a0e1a',
          night: '#111827',
          surface: '#161e2e',
          card: '#1a2338',
          border: '#2a3650',
          'border-bright': '#3a4a70',
        },
        bodhi: {
          gold: '#d4a657',
          'gold-bright': '#f0c674',
          'gold-soft': 'rgba(212,166,87,0.15)',
        },
        jade: {
          DEFAULT: '#4a8b6f',
          bright: '#6ec092',
        },
        vermilion: {
          DEFAULT: '#c9444c',
          bright: '#e85d68',
        },
        plum: {
          DEFAULT: '#9b6dd4',
          bright: '#b890e8',
        },
        text: {
          primary: '#e8e4d8',
          secondary: '#b8c0d0',
          muted: '#8a93a8',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
