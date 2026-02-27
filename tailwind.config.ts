import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        game: {
          bg: '#0a0a0f',
          panel: '#12121a',
          border: '#2a2a3a',
          text: '#c8c8e8',
          accent: '#6a5acd',
          gold: '#f0c040',
          health: '#e04040',
          mana: '#4080e0',
          xp: '#40c040',
        },
      },
    },
  },
  plugins: [],
}

export default config
