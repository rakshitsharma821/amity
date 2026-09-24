import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#0a0a0b',
          surface: 'rgba(255, 255, 255, 0.05)',
          elevated: 'rgba(255, 255, 255, 0.08)',
          card: '#111114',
          border: 'rgba(255, 255, 255, 0.10)',
          borderSubtle: 'rgba(255, 255, 255, 0.06)',
          borderBright: 'rgba(163, 230, 53, 0.35)',
        },
        terminal: {
          DEFAULT: '#39ff14',
          dim: 'rgba(57, 255, 20, 0.15)',
          glow: 'rgba(57, 255, 20, 0.4)',
        },
        acid: {
          DEFAULT: '#a3e635',
          hover: '#bbf451',
          dim: 'rgba(163, 230, 53, 0.15)',
          border: 'rgba(163, 230, 53, 0.35)',
        },
        scanner: {
          DEFAULT: '#d9f99d',
        },
        alert: {
          red: '#ff3b47',
          dim: 'rgba(255, 59, 71, 0.15)',
          border: 'rgba(255, 59, 71, 0.35)',
        },
        warn: {
          amber: '#ffb020',
          dim: 'rgba(255, 176, 32, 0.15)',
          border: 'rgba(255, 176, 32, 0.35)',
        },
        muted: {
          heading: '#f4f4f5',
          body: '#8b8b93',
          dim: '#52525b',
          dark: '#27272a',
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
