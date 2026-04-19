# Arquitectura del proyecto

## Objetivo

CMS de cartelería digital para colegio con arquitectura deliberadamente simple:

- **GitHub**: origen de verdad del código.
- **Google Apps Script**: backend + frontend web.
- **Google Sheets**: base de datos ligera.
- **Google Drive**: almacén de recursos multimedia.

Sin migraciones intermedias ni toolchains frontend.

---

## Estructura del repositorio

En raíz:
- `Code.gs`
- `screen.html`
- `admin.html`
- `appsscript.json`
- `README.md`
- `AGENTS.md`

Documentación:
- `docs/arquitectura.md`
- `docs/codex-prompts.md`

---

## Flujo principal

### 1) `doGet(e)`
Rutas:
- `?api=playlist...` → JSON para pantalla pública.
- `?view=admin` o `?admin=1` → panel admin.
- resto → `screen.html`.

### 2) Playlist pública
`getPlaylistResponse_()` valida:
- `screen`
- `token`
- pantalla existente y activa

Luego `buildPlaylist_()`:
- filtra `ASIGNACIONES` por pantalla/estado/fecha,
- ordena por `ORDEN`,
- cruza con `CONTENIDOS` activos,
- normaliza slides.

### 3) Panel admin
`admin.html` usa `google.script.run` para:
- cargar dashboard (`getAdminDashboardData`),
- guardar/editar pantallas (`savePantallaAdmin`),
- guardar/editar contenidos (`saveContenidoAdmin`),
- guardar/editar asignaciones (`saveAsignacionAdmin`),
- activar/desactivar registros,
- listar recursos Drive de carpeta configurada (`getDriveResourcesAdmin`).

---

## CRUD implementado

### `PANTALLAS`
- Alta/edición por `ID_PANTALLA`.
- Validación de `ID_PANTALLA`, `NOMBRE`, `TOKEN`.
- Normalización de `ACTIVA`, `REFRESH_SEG`, `FONDO_HEX`.
- Activar/desactivar desde tabla.

### `CONTENIDOS`
- Alta/edición por `ID_CONTENIDO`.
- Validación de `TIPO` (`HTML|IMAGE|VIDEO`) y `TITULO`.
- Para `IMAGE`/`VIDEO`: exige `URL` o `FILE_ID`.
- Activar/desactivar desde tabla.

### `ASIGNACIONES`
- Alta/edición (por fila o pareja pantalla-contenido).
- Validación de existencia de pantalla y contenido.
- Normalización de fechas (`YYYY-MM-DD` cuando posible).
- Activar/desactivar desde tabla.

---

## Drive: solución elegida

Se adopta una mejora simple y compatible:

1. **Propiedad opcional** `CARTELERIA_DRIVE_FOLDER_ID`.
2. Helper de normalización de `FILE_ID` (`normalizeDriveFileId_`) que acepta ID directo o URL de Drive.
3. Helpers para URL:
   - imagen: thumbnail de Drive,
   - vídeo: descarga/stream básico de Drive.
4. En admin: bloque para listar archivos compatibles (`image/*`, `video/*`) y enviar `FILE_ID` al formulario de contenidos.

Compatibilidad:
- no se cambia el modelo base de hojas,
- sigue funcionando con `URL` manual,
- `URL` tiene prioridad sobre `FILE_ID` si ambos existen.

Limitaciones reales:
- depende de permisos de compartición de cada archivo,
- algunas políticas de dominio pueden bloquear reproducción fuera de sesión,
- en caso de error de recurso, la pantalla continúa con el siguiente slide.

---

## Presentación visual de la pantalla pública

Se implementa la opción de **slide completo con estilo corporativo mejorado**:

- estructura reutilizable: **cabecera + zona principal + pie**,
- gradientes suaves con acentos corporativos,
- título del slide y datos de pantalla en footer,
- contenedor visual para mejorar legibilidad en pantallas grandes,
- para imagen/vídeo: capa de fondo desenfocada + capa principal para evitar bandas duras cuando la proporción no coincide,
- `object-fit` por defecto:
  - imagen: `contain` (evita recortes por defecto),
  - vídeo: `contain`.

El color base se sigue tomando de `PANTALLAS.FONDO_HEX`.

---

## Configuración

Script Properties:
- `CARTELERIA_SPREADSHEET_ID` (recomendada)
- `CARTELERIA_DRIVE_FOLDER_ID` (opcional para panel Drive)

---

## Restricciones mantenidas

- Apps Script puro.
- Runtime en raíz.
- Sin React/TypeScript/Vite/bundlers.
- Sin dependencias Node en runtime.
- Compatible con sincronización directa GitHub -> Apps Script.
