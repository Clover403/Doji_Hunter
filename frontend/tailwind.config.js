/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'doji': {
          'dark': '#0a0a0a',
          'darker': '#050505',
          'gray': '#1a1a1a',
          'light-gray': '#2a2a2a',
          'border': '#333333',
          'text': '#e0e0e0',
          'text-muted': '#888888',
          'green': '#10b981',
          'green-muted': '#059669',
          'red': '#ef4444',
          'blue': '#3b82f6'
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
