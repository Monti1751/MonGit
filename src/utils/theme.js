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

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `${r}, ${g}, ${b}`
}

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const root = document.documentElement
  const body = document.body

  root.setAttribute('data-theme', theme.id)
  body.setAttribute('data-theme', theme.id)

  const vars = {
    '--color-brand-500': theme.colors.primary,
    '--color-brand-600': theme.colors.primaryHover,
    '--color-brand-400': theme.colors.primaryLight,
    '--color-brand-300': theme.colors.primaryLight,
    '--color-bg-base': theme.colors.bg,
    '--color-bg-surface': theme.colors.surface,
    '--color-text': theme.colors.text,
    '--color-brand-rgb': hexToRgb(theme.colors.primary),
    '--color-bg-base-rgb': hexToRgb(theme.colors.bg),
    '--color-bg-surface-rgb': hexToRgb(theme.colors.surface),
    '--color-text-rgb': hexToRgb(theme.colors.text),
  }

  Object.entries(vars).forEach(([name, value]) => {
    root.style.setProperty(name, value)
    body.style.setProperty(name, value)
  })

  localStorage.setItem('mongit-theme', theme.id)
}
