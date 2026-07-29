export const THEMES = [
  {
    id: 'dark-default',
    name: 'Dark (Default)',
    colors: {
      primary: '#14b8a6',
      primaryHover: '#0d9488',
      primaryLight: '#2dd4bf',
      bg: '#080d18',
      surface: '#0a0f1c',
      text: '#e2e8f0'
    },
    preview: 'linear-gradient(135deg, #0b1121, #14b8a6)'
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    colors: {
      primary: '#ec4899',
      primaryHover: '#db2777',
      primaryLight: '#f472b6',
      bg: '#0f0a1a',
      surface: '#1a1025',
      text: '#f0e6f6'
    },
    preview: 'linear-gradient(135deg, #0f0a1a, #ec4899)'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      primaryLight: '#38bdf8',
      bg: '#001a33',
      surface: '#002244',
      text: '#e0f2fe'
    },
    preview: 'linear-gradient(135deg, #001a33, #0ea5e9)'
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      primaryLight: '#4ade80',
      bg: '#0a1a0a',
      surface: '#0f2a0f',
      text: '#dcfce7'
    },
    preview: 'linear-gradient(135deg, #0a1a0a, #22c55e)'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      primaryLight: '#fb923c',
      bg: '#1a0a00',
      surface: '#2a1500',
      text: '#fff7ed'
    },
    preview: 'linear-gradient(135deg, #1a0a00, #f97316)'
  }
]

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const root = document.documentElement
  root.setAttribute('data-theme', theme.id)
  root.style.setProperty('--color-brand-500', theme.colors.primary)
  root.style.setProperty('--color-brand-600', theme.colors.primaryHover)
  root.style.setProperty('--color-brand-400', theme.colors.primaryLight)
  root.style.setProperty('--color-bg-base', theme.colors.bg)
  root.style.setProperty('--color-bg-surface', theme.colors.surface)
  localStorage.setItem('mongit-theme', theme.id)
}
