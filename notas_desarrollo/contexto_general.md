# 📚 Contexto General de MonGit

## 🎯 Visión y Propósito

**MonGit** es un cliente Git de escritorio premium, moderno y ultrarrápido que simplifica y embellece los flujos de trabajo diarios de Git para desarrolladores. 

**Filosofía de Diseño:**
- **Local-First**: Toda la ejecución de comandos Git ocurre en el sistema local
- **Seguro**: Las credenciales se almacenan localmente en localStorage
- **Intuitivo**: Interfaz visual para operaciones Git complejas
- **Accesible**: Multiidioma (español/inglés) con interfaz oscura y moderna
- **Premium**: Efectos visuales de lujo (glassmorphism, neón glow, animaciones fluidas)

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnología | Propósito | Versión |
|-----------|----------|---------|
| **React** | Framework UI reactivo | 19.2.6 |
| **Vite** | Bundler y dev server ultrarrápido | 8.0.12 |
| **TailwindCSS** | Utilidades de estilos CSS-in-motion | 3.4.19 |
| **Lucide React** | Librería de iconos vector limpia | 1.16.0 |
| **i18next** | Sistema multiidioma/internacionalización | 26.2.0 |
| **React-i18next** | Integración React para i18n | 17.0.8 |
| **i18next-browser-languagedetector** | Detección automática de idioma del navegador | 8.2.1 |

### Backend de Escritorio
| Tecnología | Propósito | Versión |
|-----------|----------|---------|
| **Electron** | Framework para aplicaciones de escritorio | 42.2.0 |
| **simple-git** | Interfaz Node.js para ejecutar comandos Git | - |
| **Electron Builder** | Empaquetador para crear .exe portable | 26.8.1 |

### Herramientas de Desarrollo
- **PostCSS**: Procesador de CSS (autoprefixer)
- **ESLint**: Linter de código JavaScript
- **Vite Plugin Electron**: Integración entre Vite y Electron

---

## 🎨 Paleta de Colores y Elementos Estéticos

### Paleta de Colores Principales

#### Color Marca (Brand) — Teal/Esmeralda
```javascript
// Definido en tailwind.config.js
brand: {
  50:  '#f0fdf9',   // Muy claro (backgrounds)
  100: '#ccfbef',   // Claro
  200: '#99f6e0',   // Medio-claro
  300: '#5eead4',   // Medio
  400: '#2dd4bf',   // Enfático
  500: '#14b8a6',   // Principal ⭐
  600: '#0d9488',   // Hover
  700: '#0f766e',   // Active
  800: '#115e59',   // Dark
  900: '#134e4a',   // Very dark
}
```

#### Colores Secundarios (TailwindCSS Built-in)
- **Slate**: Grises neutros para backgrounds y bordes
- **Indigo**: Azul para ramas locales
- **Rose**: Rosa para ramas remotas
- **Emerald**: Verde para commits exitosos
- **Amber**: Amarillo para etiquetas (tags)

#### Colores de Rama (Branch Colors)
```javascript
const BRANCH_COLORS = {
  main: '#14b8a6',        // Brand teal
  'feature-*': '#818cf8', // Indigo
  'fix-*': '#f472b6',     // Rose
  'docs-*': '#f59e0b',    // Amber
}
```

### Elementos Estéticos

#### 1. Glassmorphism (Efecto de Vidrio Esmerilado)
Definido en `src/index.css`:

```css
.glass {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glass-light {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
```

**Uso:**
- Paneles principales (historia, merge, avanzado)
- Modales y diálogos
- Cards de información

#### 2. Neón Glow (Brillo Neón)
```css
.glow-teal {
  box-shadow: 0 0 20px rgba(20, 184, 166, 0.3);
}

.glow-brand {
  box-shadow: 0 0 15px rgba(20, 184, 166, 0.5);
}
```

**Uso:**
- Botones activos
- Elementos interactivos
- Indicadores de estado

#### 3. Tipografía

```javascript
// tailwind.config.js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],      // UI principal
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'], // Código/commits
}
```

**Pesos utilizados:**
- 300: Light (textos secundarios)
- 400: Regular (texto base)
- 500: Medium (etiquetas)
- 600: SemiBold (títulos)
- 700: Bold (énfasis)

#### 4. Animaciones y Transiciones

```html
<!-- Smooth transitions (200-300ms) -->
<div class="transition-all duration-200">

<!-- Rotación continua para carga -->
<RefreshCw className="animate-spin" />

<!-- Fade in/out -->
<div className="transition-opacity duration-300">

<!-- Scale en hover -->
<button className="hover:scale-105 transition-transform">
```

#### 5. Sombras y Profundidad

```css
/* Base Shadows */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);     /* Light */
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);    /* Medium */
box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);   /* Heavy */

/* Neón Shadows */
box-shadow: 0 0 20px rgba(20, 184, 166, 0.3);  /* Teal glow */
```

#### 6. Espaçiado y Layout

```javascript
// Utilizado consistentemente en toda la app
- p-2, p-3, p-4: Padding interno
- px-4, py-3: Padding específico de eje
- gap-2, gap-3: Espacio entre elementos flexbox
- rounded-lg, rounded-xl: Bordes redondeados
```

---

## 🌍 Sistema de Internacionalización (i18n)

### Configuración (src/i18n.js)

```javascript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Cargar archivos de traducción
import translationES from './locales/es.json'
import translationEN from './locales/en.json'

// Recursos disponibles
const resources = {
  es: { translation: translationES },
  en: { translation: translationEN }
}

// Detectar idioma guardado o del navegador
const savedLanguage = localStorage.getItem('preferred-language')
const detectedLanguage = savedLanguage || navigator.language?.split('-')[0] || 'es'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: detectedLanguage,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    react: { useSuspense: false }
  })

// Guardar preferencia cuando cambia el idioma
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('preferred-language', lng)
})
```

### Estructura de Archivos de Traducción

**Ubicación:**
- `src/locales/es.json` — Traducción al español
- `src/locales/en.json` — Traducción al inglés

**Estructura JSON:**
```json
{
  "app": {
    "title": "MonGit Desktop v1.0.0",
    "tabs": {
      "history": "Historial",
      "merge": "Fusión y Conflictos",
      "advanced": "Avanzado"
    },
    "buttons": {
      "sync": "Sincronizar (Pull & Push)",
      "newBranch": "Nueva Rama"
    }
  },
  "gitOps": {
    "title": "Operaciones Git Avanzadas",
    "stash": {
      "title": "Stash — Guardar cambios temporalmente",
      "success": "Stash guardado: \"{{message}}\""
    }
  }
}
```

### Uso en Componentes

```jsx
import { useTranslation } from 'react-i18next'

function MiComponente() {
  const { t, i18n } = useTranslation()
  
  // Obtener texto traducido
  const titulo = t('app.title')
  
  // Interpolación de variables
  const mensaje = t('messages.branchCreated', { branch: 'feature-x' })
  // → "Rama "feature-x" creada y activada"
  
  // Cambiar idioma
  const cambiarAEspanol = () => i18n.changeLanguage('es')
  
  return <h1>{titulo}</h1>
}
```

### Cadenas con Interpolación

```json
{
  "messages": {
    "branchCreated": "Rama \"{{branch}}\" creada y activada",
    "folderOpen": "Carpeta abierta: {{path}}"
  }
}
```

### Selector de Idioma

Ubicado en la barra superior derecha (src/App.jsx líneas 579-602):

```jsx
<div className="flex items-center gap-0.5">
  <button
    onClick={() => i18n.changeLanguage('es')}
    className={`p-1.5 rounded-lg ${i18n.language === 'es' ? 'bg-brand-500' : ''}`}
    title="Español"
  >
    🇪🇸
  </button>
  <button
    onClick={() => i18n.changeLanguage('en')}
    className={`p-1.5 rounded-lg ${i18n.language === 'en' ? 'bg-brand-500' : ''}`}
    title="English"
  >
    🇬🇧
  </button>
</div>
```

---

## 🏗️ Arquitectura de Componentes

### Estructura General

```
src/
├── App.jsx                 # Componente raíz (orquestador principal)
├── main.jsx                # Punto de entrada de React
├── i18n.js                 # Configuración de multiidioma
├── index.css               # Estilos globales (TailwindCSS)
│
├── components/
│   ├── LocalRepoPanel.jsx       # Panel de cambios locales y staging
│   ├── MergePanel.jsx           # Panel de fusión y resolución de conflictos
│   ├── GitOperationsPanel.jsx   # Panel de operaciones avanzadas
│   ├── ProviderSetup.jsx        # Modal de setup de proveedores
│   └── CloneRepoModal.jsx       # Modal para clonar repositorios
│
├── hooks/
│   └── useProviders.js     # Hook para gestionar proveedores conectados
│
├── providers/
│   ├── github.js           # API de GitHub
│   ├── gitlab.js           # API de GitLab
│   ├── bitbucket.js        # API de Bitbucket
│   ├── codeberg.js         # API de Codeberg
│   ├── gitea.js            # API de Gitea
│   └── index.js            # Exportador principal de proveedores
│
├── locales/
│   ├── es.json             # Traducciones al español
│   └── en.json             # Traducciones al inglés
│
└── assets/                 # Recursos (iconos, imágenes)
```

### Componentes Principales

#### 1. App.jsx (Orquestador)
- Maneja el estado global de la aplicación
- Gestiona tabs (Historial, Merge, Avanzado)
- Maneja apertura/cierre de carpetas
- Orquesta eventos entre componentes

**Props recibidas por componentes hijos:**
```javascript
{
  folderPath,      // Ruta actual del repositorio abierto
  commits,         // Array de commits de la rama activa
  branches,        // Array de ramas disponibles
  activeBranch,    // Rama actualmente activa
  onMergeComplete, // Callback después de completar merge
  onRefresh        // Callback para recargar datos
}
```

#### 2. LocalRepoPanel.jsx
**Responsabilidades:**
- Mostrar archivos modificados en el staging area
- Seleccionar archivos para commit
- Crear commits locales
- Push a remoto

**Estado interno:**
```javascript
{
  files: [],           // Archivos modificados
  selectedFiles: [],   // Archivos seleccionados para commit
  commitMessage: '',   // Mensaje del commit
  loading: false,
  error: null,
  success: null
}
```

#### 3. MergePanel.jsx
**Responsabilidades:**
- Seleccionar rama de origen y destino
- Iniciar operación de merge
- Detectar conflictos
- Resolver conflictos línea por línea
- Completar merge

**Estados del merge:**
```javascript
IDLE        // Esperando selección de rama
COMPARING   // Obteniendo diff
MERGING     // Realizando merge
CONFLICT    // Conflictos detectados
SUCCESS     // Merge completado
ERROR       // Error durante merge
```

#### 4. GitOperationsPanel.jsx
**Responsabilidades:**
- Secciones expandibles para cada operación:
  - Stash (guardar cambios temporales)
  - Rebase Interactivo (reorganizar commits)
  - Cherry-pick (aplicar commits selectos)
  - Revert (deshacer commits)
  - Tags (etiquetas de versión)

**Funciones internas:**
```javascript
StashSection({ folderPath })
RebaseSection({ folderPath, commits, onRefresh })
CherryPickSection({ folderPath, commits, activeBranch, branches })
RevertSection({ folderPath, commits })
TagsSection({ folderPath })
```

#### 5. ProviderSetup.jsx
**Responsabilidades:**
- Mostrar formularios de conexión para cada proveedor
- Validar tokens/credenciales
- Probar conexión
- Gestionar cuentas conectadas

**Proveedores soportados:**
- GitHub
- GitLab
- Bitbucket
- Codeberg
- Gitea

#### 6. CloneRepoModal.jsx
**Responsabilidades:**
- Buscar repositorios en cuentas conectadas
- Filtrar por proveedor
- Seleccionar carpeta destino
- Clonar repositorio

---

## 💾 Estructura de Datos

### Commit
```javascript
{
  id: 'a1b2c3d',              // Hash corto del commit
  message: 'Fix login bug',   // Mensaje del commit
  author: 'Ana García',       // Nombre del autor
  initials: 'AG',             // Iniciales para avatar
  color: '#14b8a6',           // Color de rama
  time: 'hace 2 horas',       // Tiempo relativo
  branch: 'main',             // Rama del commit
  tags: ['HEAD', 'origin/main'] // Etiquetas (tags, HEAD, rama remota)
}
```

### File (Archivo modificado)
```javascript
{
  id: 1,
  name: 'src/App.jsx',
  path: 'src/App.jsx',
  status: 'modified',     // 'modified' | 'added' | 'deleted'
  checked: true,          // Seleccionado para commit
  icon: '~',              // Visual indicator
  changes: {
    additions: 5,
    deletions: 2
  }
}
```

### Branch
```javascript
{
  name: 'main',
  isLocal: true,
  isActive: true,
  lastCommit: 'a1b2c3d',
  lastCommitTime: 'hace 1 hora',
  color: '#14b8a6'
}
```

### ConflictFile
```javascript
{
  path: 'src/App.jsx',
  conflicts: [
    {
      id: 1,
      yours: 'const App = () => {',
      incoming: 'export default function App() {',
      resolution: 'yours' // 'yours' | 'incoming' | 'both'
    }
  ]
}
```

---

## 📋 Flujos de Trabajo Principales

### 1. Flujo de Commit Local
```
1. Usuario abre carpeta local
2. App detecta cambios (git status)
3. Muestra archivos modificados en LocalRepoPanel
4. Usuario selecciona archivos y escribe mensaje
5. Usuario hace click en "Commit"
6. Se ejecuta: git add + git commit
7. Se actualiza historial
8. Usuario puede hacer Push
```

### 2. Flujo de Merge
```
1. Usuario selecciona rama origen y destino
2. App calcula diff (git diff rama1..rama2)
3. Si hay conflictos:
   a. Muestra archivos con conflictos
   b. Usuario resuelve cada conflicto
   c. Marca como resuelto
4. Usuario completa merge (git merge)
5. Si es exitoso, se actualiza rama activa
```

### 3. Flujo de Cambio de Idioma
```
1. Usuario hace click en botón 🇪🇸 o 🇬🇧
2. i18n.changeLanguage(lang) se ejecuta
3. Event listener de i18n guarda en localStorage
4. React se re-renderiza automáticamente
5. Todos los componentes que usan t() obtienen nuevas cadenas
```

### 4. Flujo de Stash
```
1. Usuario escribe descripción y clickea "Guardar"
2. Se ejecuta: git stash save "mensaje"
3. Se cargan todos los stashes (git stash list)
4. Usuario puede "Aplicar" o "Pop" un stash
5. Si aplica: git stash apply stash@{index}
6. Si popea: git stash pop stash@{index}
```

---

## 🎯 Convenciones de Código

### Nombres de Archivos
- Componentes React: **PascalCase** (`LocalRepoPanel.jsx`)
- Hooks: **camelCase** con prefijo `use` (`useProviders.js`)
- Utilidades: **camelCase** (`formatDate.js`)
- Estilos/CSS: **kebab-case** (`.glass-light`)

### Estructura de Componentes
```jsx
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function MiComponente({ prop1, prop2 }) {
  const { t } = useTranslation()
  const [estado, setEstado] = useState(null)
  
  useEffect(() => {
    // Lógica de efectos
  }, [])
  
  const handleAccion = () => {
    // Manejadores de eventos
  }
  
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### Uso de Iconos
```jsx
import { GitBranch, Plus, Trash2 } from 'lucide-react'

<GitBranch size={16} className="text-brand-400" />
<Plus size={20} className="text-slate-300 hover:text-white" />
```

### Clase de Estilos
```jsx
className={`
  flex items-center gap-3 px-4 py-3
  rounded-lg border border-slate-700
  bg-slate-800/50 hover:bg-slate-700
  transition-colors duration-200
  ${isActive ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400'}
`}
```

---

## 🔌 IPC (Inter-Process Communication) — Electron

### Preload Script (electron/preload.js)
Expone APIs seguras de Electron a la aplicación React:

```javascript
window.electronAPI = {
  // Sistema de archivos
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  
  // Comandos Git
  gitStatus: (path) => ipcRenderer.invoke('git-status', path),
  gitLog: (path) => ipcRenderer.invoke('git-log', path),
  gitCommit: (path, msg) => ipcRenderer.invoke('git-commit', path, msg),
  gitPush: (path) => ipcRenderer.invoke('git-push', path),
  gitPull: (path) => ipcRenderer.invoke('git-pull', path),
  gitStash: (path, msg) => ipcRenderer.invoke('git-stash', path, msg),
  // ... más métodos
}
```

### Uso en React
```jsx
const handleCommit = async () => {
  try {
    const result = await window.electronAPI.gitCommit(folderPath, message)
    if (result.success) {
      showSuccess('Commit realizado')
    }
  } catch (err) {
    showError(err.message)
  }
}
```

---

## 🚀 Ciclo de Vida de la Aplicación

### Inicio
1. `electron/main.js` crea ventana Electron
2. React carga `src/main.jsx`
3. `i18n.js` detecta idioma preferido
4. Aplicación renderiza `App.jsx`
5. Usuario selecciona carpeta o crea conexión cloud

### Durante Ejecución
1. Usuario interactúa con la UI
2. Componentes disparan comandos Git vía Electron API
3. Electron ejecuta comandos locales
4. Resultados se devuelven a React
5. Estado se actualiza y UI se re-renderiza
6. Si cambia idioma, todas las cadenas se actualizan automáticamente

### Build/Distribución
```bash
npm run dist
  ↓
npm run build (compila React + Electron en /dist y /dist-electron)
  ↓
electron-builder (empaqueta en .exe portátil)
  ↓
dist-package/MonGit 1.0.0.exe (listo para distribuir)
```

---

## 📝 Guías de Extensión

### Agregar Nueva Pestaña
1. Crear nuevo componente en `src/components/MiPestaña.jsx`
2. Importar en `src/App.jsx`
3. Agregar entrada en `app.tabs` en `src/locales/es.json` y `en.json`
4. Agregar botón de tab en barra superior
5. Agregar condicional para renderizar el componente

### Agregar Nuevo Idioma
1. Crear `src/locales/fr.json` con todas las cadenas
2. Importar en `src/i18n.js`
3. Agregar a `resources` object en `i18n.js`
4. Agregar botón selector de idioma en App.jsx

### Agregar Nuevo Proveedor Git
1. Crear `src/providers/miproveedorapi.js` con métodos:
   - `testConnection(credentials)`
   - `listRepositories(token)`
   - `getRepository(token, repo)`
2. Exportar en `src/providers/index.js`
3. Agregar formulario en `ProviderSetup.jsx`
4. Agregar traducciones para el proveedor

### Agregar Nuevo Comando Git
1. Crear handler en `electron/main.js`:
   ```javascript
   ipcMain.handle('git-mi-comando', async (event, path, args) => {
     const git = simpleGit(path)
     return await git.miComando(args)
   })
   ```
2. Exponer en `electron/preload.js`:
   ```javascript
   gitMiComando: (path, args) => ipcRenderer.invoke('git-mi-comando', path, args)
   ```
3. Usar en componente React:
   ```javascript
   await window.electronAPI.gitMiComando(folderPath, args)
   ```

---

## 📊 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Líneas de Código (Frontend)** | ~2,500+ |
| **Componentes React** | 6 principales |
| **Idiomas Soportados** | 2 (ES, EN) |
| **Cadenas i18n** | 150+ |
| **Librerías de Terceros** | 10 principales |
| **Tamaño del .exe** | ~93 MB |
| **Plataformas Objetivo** | Windows 64-bit |

---

## ✅ Checklist para Futuros Desarrolladores

- [ ] Revisar `src/i18n.js` para entender multiidioma
- [ ] Estudiar `src/App.jsx` para ver orquestación principal
- [ ] Ejecutar `npm run dev` y probar flujos básicos
- [ ] Cambiar idioma y verificar que funcione
- [ ] Abrir carpeta local y verificar historial
- [ ] Revisar cómo se estructuran traduciones en `src/locales/`
- [ ] Revisar componentes en `src/components/` para entender patrones
- [ ] Leer documentación de `simple-git` para agregar comandos nuevos
- [ ] Revisar `electron/main.js` para entender IPC

---

**Última actualización:** 2026-06-06
**Versión de App:** 1.0.0
**Versión de React:** 19.2.6
**Versión de Electron:** 42.2.0
