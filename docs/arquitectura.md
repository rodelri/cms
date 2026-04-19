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

Si no se pide API, `doGet(e)` sirve `screen.html`.

### 2. Carga de playlist
El frontend hace una petición a:

`?api=playlist&screen=...&token=...`

El backend valida:

- que exista la pantalla
- que esté activa
- que el token coincida

### 3. Construcción de playlist
`buildPlaylist_()`:

- lee `ASIGNACIONES`
- filtra por pantalla
- filtra por asignaciones activas
- filtra por rango de fechas (`DESDE` / `HASTA`)
- ordena por `ORDEN`
- cruza con `CONTENIDOS`
- devuelve una lista normalizada de slides

### 4. Reproducción
`screen.html` rota automáticamente entre slides de tipo:

- `HTML`
- `IMAGE`
- `VIDEO`

Y refresca periódicamente la playlist para detectar cambios en Sheets.

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

### Google Sheets como base ligera
Es suficiente para un CMS inicial de cartelería con pocas tablas y edición por personal no técnico.

### Drive como capa de recursos
Drive simplifica la gestión de imágenes y vídeos internos del centro sin desplegar infraestructura adicional.

---

## Evolución prevista

Siguientes pasos razonables:

1. panel de administración básico dentro de Apps Script
2. altas y edición de pantallas
3. altas y edición de contenidos
4. gestión de asignaciones desde interfaz
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
