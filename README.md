# CMS de cartelería digital para colegio

Este repositorio es el **origen de verdad en GitHub** del proyecto y está pensado para sincronizarse **directamente con Google Apps Script**, sin migración posterior.

## Enfoque

- Apps Script puro desde el principio.
- Archivos runtime en la raíz del repositorio.
- Google Sheets como base de datos ligera.
- Google Drive como origen de recursos.
- Preparado para trabajar con GitHub Assistant y Codex.

## Archivos principales

- `Code.gs` → backend principal
- `screen.html` → reproductor de pantalla completa
- `appsscript.json` → manifiesto Apps Script
- `AGENTS.md` → reglas para Codex

## Hojas previstas

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

## Próximo paso natural

Desarrollar un panel de administración mínimo dentro del propio Apps Script sin introducir toolchains innecesarios.
