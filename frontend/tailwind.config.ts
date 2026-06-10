import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#E3F2FD', 100: '#BBDEFB', 200: '#90CAF2', 300: '#64B5F6', 400: '#42A5F5', 500: '#2196F3', 600: '#1E88E5', 700: '#1976D2', 800: '#1565C0', 900: '#0D47A1' },
      },
    },
  },
  plugins: [],
};

export default config;
