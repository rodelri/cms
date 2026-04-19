# Arquitectura del proyecto

## Objetivo

Este proyecto implementa un CMS de cartelería digital para un colegio usando una arquitectura intencionadamente simple:

- **GitHub** como origen de verdad del código.
- **Google Apps Script** como backend y frontend web.
- **Google Sheets** como configuración y base de datos ligera.
- **Google Drive** como repositorio de archivos multimedia.

La idea no es construir un prototipo para migrarlo después, sino un proyecto que viva directamente con estructura Apps Script.

---

## Estructura del repositorio

### En raíz
- `Code.gs`
- `screen.html`
- `admin.html`
- `appsscript.json`
- `AGENTS.md`
- `README.md`
- `.clasp.json.example`
- `.claspignore`

### Documentación
- `docs/arquitectura.md`
- `docs/codex-prompts.md`

Esta organización prioriza compatibilidad con sincronización directa GitHub -> Apps Script.

---

## Flujo funcional actual

### 1. Cliente pantalla
Una pantalla abre la web app con una URL del estilo:

`...?screen=ENTRADA_PRINCIPAL&token=demo-token-001`

Si no se pide API ni vista admin, `doGet(e)` sirve `screen.html`.

### 2. Cliente admin
El panel inicial de administración se abre con:

`...?view=admin`

O alternativamente:

`...?admin=1`

`doGet(e)` sirve `admin.html`, que usa `google.script.run` para cargar el resumen y los listados de las hojas base.

### 3. Carga de playlist
El frontend público hace una petición a:

`?api=playlist&screen=...&token=...`

El backend valida:

- que exista la pantalla
- que esté activa
- que el token coincida

### 4. Construcción de playlist
`buildPlaylist_()`:

- lee `ASIGNACIONES`
- filtra por pantalla
- filtra por asignaciones activas
- filtra por rango de fechas (`DESDE` / `HASTA`)
- ordena por `ORDEN`
- cruza con `CONTENIDOS`
- devuelve una lista normalizada de slides

### 5. Reproducción
`screen.html` rota automáticamente entre slides de tipo:

- `HTML`
- `IMAGE`
- `VIDEO`

Y refresca periódicamente la playlist para detectar cambios en Sheets.

### 6. Resumen admin
`getAdminDashboardData()` devuelve:

- conteos globales
- listado de `PANTALLAS`
- listado de `CONTENIDOS`
- listado de `ASIGNACIONES`
- identificador y URL de la hoja configurada

Esto permite tener una primera base de panel sin meter aún CRUD ni formularios.

---

## Modelo de datos inicial

## Hoja `PANTALLAS`
Identifica cada dispositivo o pantalla lógica.

Campos:
- `ID_PANTALLA`
- `NOMBRE`
- `UBICACION`
- `TOKEN`
- `ACTIVA`
- `REFRESH_SEG`
- `FONDO_HEX`

### Uso
- `TOKEN` protege el endpoint.
- `REFRESH_SEG` define cada cuánto se vuelve a consultar la playlist.
- `FONDO_HEX` permite definir un color de fondo por pantalla.

## Hoja `CONTENIDOS`
Contiene los recursos disponibles.

Campos:
- `ID_CONTENIDO`
- `TIPO`
- `TITULO`
- `TEXTO_HTML`
- `FILE_ID`
- `URL`
- `DURACION_SEG`
- `ACTIVO`

### Uso
- `TIPO` previsto: `HTML`, `IMAGE`, `VIDEO`
- `TEXTO_HTML` sirve para slides HTML simples
- `FILE_ID` permite construir URL desde Drive
- `URL` puede apuntar a recurso externo o sobrescribir el `FILE_ID`
- `DURACION_SEG` controla duración por slide

## Hoja `ASIGNACIONES`
Define qué contenido ve cada pantalla y en qué orden.

Campos:
- `ID_PANTALLA`
- `ID_CONTENIDO`
- `ORDEN`
- `DESDE`
- `HASTA`
- `ACTIVA`

### Uso
- Permite activar contenido por fechas.
- Permite secuenciar una playlist por pantalla.

---

## Decisiones técnicas importantes

### Apps Script puro
Se evita introducir herramientas modernas de frontend porque empeoran la sincronización directa con Apps Script y añaden complejidad innecesaria.

### Runtime en raíz
Se mantienen los archivos principales en la raíz para facilitar el flujo con GitHub Assistant y herramientas equivalentes.

### Primer admin sin framework
`admin.html` usa HTML, CSS y JS nativos con `google.script.run`. Esto permite evolucionar el panel sin introducir pipelines de build.

### Google Sheets como base ligera
Es suficiente para un CMS inicial de cartelería con pocas tablas y edición por personal no técnico.

### Drive como capa de recursos
Drive simplifica la gestión de imágenes y vídeos internos del centro sin desplegar infraestructura adicional.

### .claspignore controlado
`.claspignore` deja pasar solo los archivos runtime que deben sincronizarse con Apps Script. Al añadir `admin.html`, se ha incluido explícitamente para que no se pierda en la sincronización.

---

## Evolución prevista

Siguientes pasos razonables:

1. CRUD de pantallas dentro de `admin.html`
2. CRUD de contenidos
3. CRUD de asignaciones
4. filtros y búsqueda rápida en tablas
5. grupos de pantallas
6. caché ligera para lecturas frecuentes
7. control de acceso por usuarios autorizados

---

## Restricciones deliberadas

Este proyecto **no** debe derivar sin necesidad hacia:

- React
- TypeScript
- Vite
- SPAs con build
- bases de datos externas
- despliegues separados del runtime Apps Script

Mientras el alcance sea el CMS de cartelería del colegio, la prioridad es simplicidad, mantenibilidad y despliegue directo.
