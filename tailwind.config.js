/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50:  'var(--color-brand-50, #f0fdf9)',
          100: 'var(--color-brand-100, #ccfbef)',
          200: 'var(--color-brand-200, #99f6e0)',
          300: 'var(--color-brand-300, #5eead4)',
          400: 'var(--color-brand-400, #2dd4bf)',
          500: 'var(--color-brand-500, #14b8a6)',
          600: 'var(--color-brand-600, #0d9488)',
          700: 'var(--color-brand-700, #0f766e)',
          800: 'var(--color-brand-800, #115e59)',
          900: 'var(--color-brand-900, #134e4a)',
        },
      },
    },
  },
  plugins: [],
}
