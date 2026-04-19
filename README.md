# CMS de cartelería digital para colegio

Repositorio preparado como **origen de verdad en GitHub** para sincronización directa con **Google Apps Script**.

## Principios

- Runtime Apps Script puro (sin React, sin TypeScript, sin bundlers).
- Archivos runtime en raíz.
- Google Sheets como almacenamiento funcional.
- Google Drive como origen de imágenes y vídeos.

## Archivos clave

### Runtime
- `Code.gs` → backend Apps Script (API playlist + lógica admin + helpers Drive)
- `screen.html` → vista pública de cartelería
- `admin.html` → panel de administración con CRUD básico
- `appsscript.json` → manifiesto Apps Script

### Documentación
- `README.md`
- `docs/arquitectura.md`
- `docs/codex-prompts.md`

## Funcionalidad actual

### Vista pública
- Endpoint `?api=playlist&screen=...&token=...`.
- Validación de pantalla activa + token.
- Rotación de slides `HTML`, `IMAGE`, `VIDEO`.
- Refresco automático según `REFRESH_SEG`.
- Presentación visual con cabecera, zona central y pie (estilo corporativo simple).

### Panel admin (`?view=admin`)
CRUD básico para:
- `PANTALLAS`: listar, crear/editar, activar/desactivar.
- `CONTENIDOS`: listar, crear/editar, activar/desactivar.
- `ASIGNACIONES`: listar, crear/editar, activar/desactivar.

Incluye:
- validaciones básicas de campos obligatorios,
- normalización de fechas,
- edición desde tabla,
- estado visual activo/inactivo.

## Modelo de hojas

### `PANTALLAS`
- `ID_PANTALLA`
- `NOMBRE`
- `UBICACION`
- `TOKEN`
- `ACTIVA`
- `REFRESH_SEG`
- `FONDO_HEX`

### `CONTENIDOS`
- `ID_CONTENIDO`
- `TIPO` (`HTML`, `IMAGE`, `VIDEO`)
- `TITULO`
- `TEXTO_HTML`
- `FILE_ID`
- `URL`
- `DURACION_SEG`
- `ACTIVO`

### `ASIGNACIONES`
- `ID_PANTALLA`
- `ID_CONTENIDO`
- `ORDEN`
- `DESDE`
- `HASTA`
- `ACTIVA`

## Configuración por Script Properties

### Obligatoria/recomendada
- `CARTELERIA_SPREADSHEET_ID` (recomendada): ID de la hoja de cálculo con datos del CMS.

### Nueva para Drive (opcional)
- `CARTELERIA_DRIVE_FOLDER_ID`: carpeta de Drive para listar recursos desde el panel admin.

Si no se define la carpeta Drive:
- el CMS sigue funcionando,
- simplemente no se listan recursos en el bloque “Recursos de Google Drive”.

## Gestión de recursos Drive

El sistema mantiene compatibilidad con el modelo actual (`FILE_ID` o `URL`):

1. Puedes guardar `URL` directa del recurso.
2. Puedes guardar `FILE_ID` de Drive.
3. Si pegas una URL de Drive en `FILE_ID`, backend intenta extraer y normalizar el ID.
4. Para `IMAGE`/`VIDEO`, si `URL` está vacía y hay `FILE_ID`, se genera URL automáticamente.

Notas de permisos:
- Los dispositivos que reproducen cartelería deben tener acceso de lectura al archivo.
- Si un archivo no es accesible, la pantalla mostrará error en ese slide y avanzará al siguiente.

## Puesta en marcha mínima

1. Sincroniza con tu proyecto de Apps Script.
2. Configura `CARTELERIA_SPREADSHEET_ID`.
3. (Opcional) Configura `CARTELERIA_DRIVE_FOLDER_ID`.
4. Ejecuta `setupCarteleria()` una vez.
5. Despliega la web app.
6. Abre `?view=admin` para administrar datos.
7. Abre una pantalla, por ejemplo:

```text
...?screen=ENTRADA_PRINCIPAL&token=demo-token-001
```

## Criterio técnico

Se mantiene intencionalmente simple para Apps Script:
- sin pipeline frontend,
- sin migraciones de stack,
- despliegue directo y mantenible para un centro educativo.


## Problema común: “Error de red o parsing / Failed to fetch”

Si aparece en `screen.html`:

1. Verifica que estás usando la **URL desplegada** de Web App (no la vista previa del editor).
2. Revisa en Deploy que el acceso permita al dispositivo de pantalla consultar la app.
3. Comprueba `screen` y `token` válidos.

La pantalla intenta consultar la API por la URL configurada y también por la URL actual como fallback.
Si la pantalla se queda en "Iniciando pantalla…", revisa conectividad del dispositivo: ahora hay timeout de red y el error se mostrará en pantalla automáticamente.

