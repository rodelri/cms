# CMS de cartelería digital para colegio

Este repositorio está preparado para ser el **origen de verdad en GitHub** y sincronizarse **directamente con Google Apps Script**.

## Enfoque

- No se plantea una migración posterior.
- El código Apps Script vive desde el principio en este repositorio.
- La sincronización con Apps Script se hará desde GitHub mediante tu flujo habitual.
- Los archivos del proyecto Apps Script están en la **raíz del repositorio** para maximizar compatibilidad con herramientas de sincronización.

## Objetivo funcional

CMS de cartelería digital para un colegio con:

- varias pantallas en distintas entradas o zonas
- contenido distinto por pantalla o por grupos de pantallas
- reproducción automática a pantalla completa
- backend en Google Apps Script
- Google Sheets como base de datos ligera
- Google Drive para imágenes, vídeos y recursos
- panel de administración dentro del propio Apps Script

## Archivos clave del proyecto Apps Script

### Runtime
- `Code.gs` → backend principal
- `screen.html` → frontend reproductor de pantalla
- `admin.html` → primer panel de administración
- `appsscript.json` → manifiesto del proyecto

### Gobernanza del repo
- `AGENTS.md` → instrucciones para Codex
- `.clasp.json.example` → ejemplo si quieres usar `clasp` como respaldo
- `.claspignore` → exclusiones para sincronización por `clasp`

### Documentación
- `docs/arquitectura.md` → decisiones técnicas
- `docs/codex-prompts.md` → prompts listos para pedirle trabajo a Codex

## Esqueleto funcional incluido

Este repo ya incluye:

- `doGet(e)` que sirve la pantalla HTML por defecto
- vista admin con `?view=admin` o `?admin=1`
- endpoint JSON `?api=playlist&screen=...&token=...`
- lectura base de configuración desde Google Sheets
- construcción de playlist por pantalla
- validación de pantalla activa y token
- soporte inicial para slides `HTML`, `IMAGE` y `VIDEO`
- rotación automática en `screen.html`
- refresco periódico de playlist
- función `setupCarteleria()` para crear hojas base y datos demo
- función `getAdminDashboardData()` para cargar resumen y tablas del panel

## Modelo inicial previsto en Google Sheets

### PANTALLAS
- `ID_PANTALLA`
- `NOMBRE`
- `UBICACION`
- `TOKEN`
- `ACTIVA`
- `REFRESH_SEG`
- `FONDO_HEX`

### CONTENIDOS
- `ID_CONTENIDO`
- `TIPO`
- `TITULO`
- `TEXTO_HTML`
- `FILE_ID`
- `URL`
- `DURACION_SEG`
- `ACTIVO`

### ASIGNACIONES
- `ID_PANTALLA`
- `ID_CONTENIDO`
- `ORDEN`
- `DESDE`
- `HASTA`
- `ACTIVA`

## Puesta en marcha mínima

1. Sincroniza el repo con tu proyecto de Google Apps Script.
2. Configura `CARTELERIA_SPREADSHEET_ID` en Script Properties si vas a usar una hoja concreta.
3. Ejecuta `setupCarteleria()` una vez para crear la estructura base.
4. Despliega la web app.
5. Abre una pantalla con una URL como:

```text
...?screen=ENTRADA_PRINCIPAL&token=demo-token-001
```

6. Prueba el endpoint:

```text
...?api=playlist&screen=ENTRADA_PRINCIPAL&token=demo-token-001
```

7. Abre el panel inicial de administración:

```text
...?view=admin
```

## Criterio técnico del repo

Este proyecto debe seguir siendo:

- Apps Script puro
- simple de desplegar
- simple de mantener
- compatible con sincronización directa GitHub -> Apps Script
- libre de toolchains frontend innecesarios

## Próximo paso natural

Añadir CRUD simple sobre pantallas, contenidos y asignaciones dentro del panel admin.
