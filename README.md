# 🚀 MonGit

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
* **Panel de Configuración de Proveedores**: Conecta y gestiona tus cuentas de GitHub, GitLab y otros proveedores de Git Cloud.
* **Selector Local-First**: Abre cualquier carpeta de tu ordenador al instante para empezar a trabajar de inmediato en local.

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
* **Ruta de Salida**: `D:\GitHub\MonGit\dist-package\MonGit 0.0.0.exe`
* **Tamaño**: ~93 MB (Autónomo, listo para copiar a un pendrive o compartir).

---

> [!NOTE]  
> **MonGit** es un proyecto local-first seguro. Los comandos Git de backend se ejecutan localmente en tu sistema bajo los mismos permisos de tu instalación de Git de confianza.
