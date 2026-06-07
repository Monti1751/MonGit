# 🚀 MonGit

[![Versión](https://img.shields.io/badge/Versi%C3%B3n-1.0.0-emerald.svg?style=flat-square)](https://github.com/Monti1751/MonGit)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-indigo.svg?style=flat-square)](LICENSE)

> **MonGit** es un cliente Git de escritorio premium, ultrarrápido y moderno diseñado para desarrolladores que buscan simplificar y embellecer sus flujos de trabajo diarios de Git. Con una interfaz oscura futurista con efectos de **glassmorphism**, animaciones suaves y micro-interacciones interactivas, MonGit combina la potencia de Git real en local con una experiencia visual incomparable.

---

## ✨ Características Destacadas

### 1. 🪵 Historial Visual e Interactivo (Grafo Real)
* **Visualización de Commits**: Línea temporal dinámica que conecta los commits del repositorio en tiempo real.
* **Inspección de Fusiones (Merges)**: Los commits de tipo *merge* se identifican automáticamente y se destacan con un color púrpura neón y una insignia animada de `Merge`.
* **Punteros y Decoraciones de Git en Vivo**: Visualiza exactamente dónde están tus ramas y tags con etiquetas con código de colores:
  * 🟢 **Esmeralda**: Puntero `HEAD` activo.
  * 🔵 **Índigo**: Ramas locales.
  * 🔴 **Rosa carmesí**: Ramas remotas de GitHub (`origin/...`).
  * 🟡 **Ámbar**: Etiquetas de versión (`tag: ...`).
* **Actualización Manual**: Botón interactivo `RefreshCw` en el historial con micro-animación de rotación continua durante la carga.

### 2. 🌿 Gestión Segura de Ramas
* **Creación de Ramas**: Crea y activa de inmediato nuevas ramas locales directamente desde la interfaz.
* **Cambio Instantáneo**: Cambia entre tus ramas locales con un solo clic.
* **Borrado Seguro de Ramas**:
  * Pasa el cursor por encima de cualquier rama en la barra lateral para revelar el botón de eliminar (`Trash2`).
  * **Modal de Advertencia Premium**: Evita pérdidas accidentales avisándote si la rama tiene commits sin fusionar.
  * **Checkbox Sincronizado**: Opción integrada para eliminar también la rama directamente en GitHub (`git push origin --delete <rama>`) de manera asíncrona y no bloqueante.
  * *Protección integrada*: No se permite eliminar la rama activa ni la rama `main`.

### 3. 📂 Staging y Confirmaciones (Staging Area)
* **Detección Automática**: Muestra en tiempo real los archivos modificados (`~`), nuevos (`+`) y eliminados (`-`) de tu carpeta de trabajo.
* **Selección Selectiva**: Elige qué archivos incluir en tu próxima confirmación.
* **Commits Reales**: Escribe tu mensaje y confirma los cambios locales directamente.
* **Sincronización Total (Pull & Push)**: Botón dedicado en la barra superior para sincronizar tus cambios locales con el repositorio en la nube en un solo paso.

### 4. 🔒 Soporte Multicuenta y Nube
* **Panel de Configuración de Proveedores**: Conecta y gestiona tus cuentas de múltiples proveedores Git:
  * 🐙 **GitHub**
  * 🦊 **GitLab**
  * 🪣 **Bitbucket**
  * 🐦 **Codeberg**
  * 🍃 **Gitea**
* **Selector Local-First**: Abre cualquier carpeta de tu ordenador al instante para empezar a trabajar de inmediato en local.
* **Prueba de Conexión**: Verifica automáticamente la conectividad con tus cuentas cloud en tiempo real.

### 5. 📥 Clonación de Repositorios
* **Clonación Inteligente**: Busca y clona repositorios desde todas tus cuentas conectadas.
* **Filtro por Proveedor**: Filtra repositorios por proveedor específico o visualiza todos a la vez.
* **Búsqueda Avanzada**: Busca por nombre de repositorio o descripción.
* **Selección de Carpeta**: Elige dónde guardar el repositorio clonado en tu sistema local.

### 6. ✨ Creación de Nuevos Repositorios
* **Crear en la Nube**: Crea nuevos repositorios directamente desde MonGit en tu cuenta cloud.
* **Configuración Flexible**: Establece privacidad (público/privado), nombre y descripción.
* **Inicialización Automática**: Se crea automáticamente con archivo README.

### 7. 🔄 Resolución de Conflictos de Merge
* **Detección Automática**: Identifica conflictos durante operaciones de merge.
* **Editor de Conflictos Interactivo**: Visualiza y resuelve conflictos línea por línea.
* **Dos Estrategias de Resolución**: 
  * Usar cambios locales (theirs)
  * Usar cambios remotos (ours)
* **Validación de Merge**: Completa el merge una vez resueltos todos los conflictos.

### 8. ⚡ Operaciones Git Avanzadas
La pestaña **Avanzado** te proporciona herramientas profesionales para el control avanzado del historial de commits:

#### 🗂️ Stash (Guardar Cambios Temporalmente)
* **Guardar Cambios**: Guarda cambios locales sin hacer commit para cambiar de rama sin perder trabajo.
* **Aplicar/Pop**: Restaura tus cambios guardados cuando los necesites.
* **Gestión de Múltiples Stashes**: Guarda y maneja varios stashes con descripciones personalizadas.

#### 📋 Rebase Interactivo
* **Reorganizar Commits**: Reordena commits en cualquier orden deseado.
* **Fusionar Commits (Squash)**: Combina múltiples commits en uno solo.
* **Renombrar Mensajes (Reword)**: Edita los mensajes de commit en el historial.
* **Limpiar Historial**: Elimina commits sin deseados o fija commits temporales con fixup.
* **Interfaz Visual**: Selecciona acciones para cada commit de forma intuitiva.

#### 🎯 Cherry-pick (Aplicar Commits Selectos)
* **Copiar Commits**: Aplica un commit específico de una rama a otra sin necesidad de mergear.
* **Selector Visual**: Elige el commit y la rama destino desde la interfaz.
* **Preservar Historial**: Mantén la flexibilidad de aplicar cambios específicos sin fusionar ramas completas.

#### ↩️ Revert (Deshacer Commits)
* **Deshacer Seguro**: Crea nuevos commits que deshacen los cambios de commits anteriores.
* **Preserva Historial**: A diferencia de reset, revert mantiene un registro completo del cambio.
* **Control Selectivo**: Elige exactamente qué commit deshacer.

#### 🏷️ Gestión de Tags (Etiquetas de Versión)
* **Crear Tags**: Crea etiquetas anotadas para marcar versiones importantes.
* **Mensajes de Tags**: Agrega descripciones a cada etiqueta de versión.
* **Publicar Tags**: Envía tus tags al repositorio remoto.
* **Gestión**: Visualiza, edita y elimina tags fácilmente.

#### 📦 Gestión de Submódulos
* **Agregar submódulos**: Incluye repositorios dentro de tu proyecto principal manteniendo su historial independiente.
* **Actualizar submódulos**: Sincroniza submodules con sus commits más recientes.
* **Eliminar submódulos**: Remueve submodules del proyecto gestionando correctamente el `.gitmodules` y `.git/config`.

#### 🔀 Diff Avanzado
* **Comparar ramas**: Analiza diferencias entre dos ramas en un visor unificado.
* **Comparar commits**: Revisa los cambios introducidos entre dos commits concretos.
* **Visores múltiples**: Alterna entre modos de visualización unificada y lateral.

#### 🧩 Plantillas de Commit
* **Plantillas predefinidas**: Elige entre convencional, semántica o Angular para estructurar tus mensajes.
* **Selector integrado**: Acceso directo desde el panel de staging sin abandonar el flujo de trabajo.
* **Personalización rápida**: Las plantillas se cargan instantáneamente en el área de mensaje del commit.

#### 🗂️ Workspace Multirepositorio
* **Múltiples repositorios**: Gestiona varios proyectos locales desde una única interfaz.
* **Sincronización en lote**: Aplica Pull y Push a todos los repos seleccionados en un solo clic.
* **Persistencia**: Los repositorios agregados se recuerdan entre sesiones gracias a `localStorage`.
* **Acceso rápido**: Botón dedicado en la barra superior para abrir el workspace multirepo.

### 9. 🌍 Internacionalización (i18n)
* **Soporte Multiidioma**: Interfaz completa en español e inglés.
* **Detección Automática**: Se adapta al idioma del sistema operativo.
* **Fácil de Extender**: Estructura lista para agregar más idiomas.

---

## 🛠️ Tecnologías Utilizadas

MonGit está construido sobre una arquitectura moderna e híbrida que aprovecha lo mejor de las tecnologías web y de escritorio:

* **Frontend**: [React 19](https://react.dev/) + [Vite](https://vite.dev/) para una velocidad de renderizado instantánea y HMR ultrarrápido.
* **Estilos**: [TailwindCSS](https://tailwindcss.com/) + CSS Vanilla optimizado para lograr efectos premium de desenfoque de fondo (backdrop-blur), sombras neón y degradados coloridos.
* **Iconos**: [Lucide React](https://lucide.dev/) para una iconografía limpia y consistente.
* **Backend de Escritorio**: [Electron](https://www.electronjs.org/) para acceder de forma segura al sistema de archivos local y ejecutar comandos Git nativos.
* **Empaquetado**: [Electron Builder](https://www.electron.build/) para generar el paquete de distribución final de Windows.

---

## 🚀 Guía de Desarrollo Local

Si deseas probar, modificar o compilar MonGit tú mismo, sigue estos sencillos pasos:

### Prerrequisitos
* Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
* Tener [Git](https://git-scm.com/) instalado en tu sistema.

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/Monti1751/MonGit.git
cd MonGit
npm install
```

### 2. Iniciar el servidor de desarrollo
Este comando iniciará el entorno de desarrollo de Vite y abrirá automáticamente la ventana de la aplicación Electron:
```bash
npm run dev
```

### 3. Compilar la aplicación
Para compilar los recursos de frontend y backend para producción:
```bash
npm run build
```

---

## 📦 Compilación Portable (.exe)

Una de las grandes ventajas de MonGit es que puedes compilarlo como un único archivo **ejecutable portátil (.exe)** para Windows que no requiere instalación previa y se puede llevar a cualquier sitio.

Para compilar y empaquetar el ejecutable ejecute:
```bash
npm run dist
```

Este comando:
1. Realiza una compilación limpia de los archivos de frontend en `/dist` y de Electron en `/dist-electron`.
2. Llama a `electron-builder` para empaquetar todo el código y dependencias en un ejecutable único portable de 64 bits.

### 📁 Ejecutable Final Generado
* **Ruta de Salida**: `\MonGit\dist-package\MonGit 1.0.0.exe`
* **Tamaño**: ~93 MB (Autónomo, listo para copiar a un pendrive o compartir).

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para obtener más detalles.

---

> [!NOTE]  
> **MonGit** es un proyecto local-first seguro. Los comandos Git de backend se ejecutan localmente en tu sistema bajo los mismos permisos de tu instalación de Git de confianza.
