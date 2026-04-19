# AGENTS.md

## Propósito del repositorio

Este repositorio es el **origen de verdad** del CMS de cartelería digital del colegio.

La arquitectura objetivo es:

- **GitHub** como fuente principal de código.
- **Google Apps Script** como runtime backend y frontend web.
- **Google Sheets** como base de datos ligera.
- **Google Drive** como almacén de recursos.

No se está construyendo un prototipo para migrar después. El proyecto debe vivir ya con estructura de Apps Script.

---

## Regla principal

**Mantén el proyecto como Apps Script puro.**

Eso significa:

- No introducir React.
- No introducir TypeScript.
- No introducir Vite.
- No introducir Webpack, Parcel, Rollup ni bundlers.
- No introducir dependencias Node para runtime.
- No mover el runtime a subcarpetas tipo `src/` si eso complica la sincronización con Apps Script.
- No convertir esto en una SPA moderna con pipeline de build.

Si en algún momento hace falta tooling auxiliar de desarrollo, debe ser opcional, claramente separado, y nunca condicionar el runtime principal.

---

## Archivos runtime

Estos archivos deben seguir siendo la base del proyecto y vivir en la **raíz del repositorio**:

- `Code.gs`
- `screen.html`
- `appsscript.json`

Si en el futuro se añaden más vistas o archivos `.gs`, la prioridad sigue siendo la compatibilidad directa con Google Apps Script.

---

## Objetivo funcional actual

Construir un CMS de cartelería digital para un colegio con:

- varias pantallas en entradas, pasillos o zonas comunes
- contenido distinto por pantalla o por grupos de pantallas
- reproducción automática a pantalla completa
- backend en Google Apps Script
- Google Sheets como almacenamiento base
- Google Drive como origen de imágenes, vídeos y otros recursos
- posibilidad futura de panel de administración dentro del propio Apps Script

---

## Modelo de datos inicial

### Hoja `PANTALLAS`
- `ID_PANTALLA`
- `NOMBRE`
- `UBICACION`
- `TOKEN`
- `ACTIVA`
- `REFRESH_SEG`
- `FONDO_HEX`

### Hoja `CONTENIDOS`
- `ID_CONTENIDO`
- `TIPO`
- `TITULO`
- `TEXTO_HTML`
- `FILE_ID`
- `URL`
- `DURACION_SEG`
- `ACTIVO`

### Hoja `ASIGNACIONES`
- `ID_PANTALLA`
- `ID_CONTENIDO`
- `ORDEN`
- `DESDE`
- `HASTA`
- `ACTIVA`

---

## Criterios de implementación

Cuando modifiques el repositorio:

1. **Respeta la simplicidad.**
   - Prefiere funciones claras y pequeñas.
   - Evita capas innecesarias.

2. **No rompas la sincronización directa GitHub -> Apps Script.**
   - Piensa siempre en cómo quedará el repo al sincronizarse.

3. **Mantén la compatibilidad con HtmlService.**
   - HTML, CSS y JS integrados o en archivos compatibles con Apps Script.
   - Sin imports de frontend que requieran build.

4. **Usa Google Sheets como fuente de configuración.**
   - No meter bases de datos externas si no se piden.

5. **No compliques el despliegue.**
   - Debe poder abrirse en Apps Script, sincronizar y desplegarse como web app.

6. **Documenta decisiones relevantes.**
   - Si cambias arquitectura o flujo, actualiza `README.md` y `docs/arquitectura.md`.

---

## Qué sí puedes hacer

- Añadir nuevas funciones `.gs`.
- Añadir nuevas vistas HTML para administración o pantallas especiales.
- Añadir helpers para validación, lectura de Sheets y generación de playlists.
- Mejorar la rotación de contenidos.
- Añadir caché ligera si simplifica y no rompe consistencia.
- Añadir validaciones de tokens, activación por fechas y agrupación de pantallas.
- Preparar panel admin dentro de Apps Script.

---

## Qué no debes hacer sin que se pida explícitamente

- Reescribir todo el proyecto con frameworks modernos.
- Mover el runtime fuera de la raíz.
- Introducir un sistema de build.
- Añadir complejidad devops innecesaria.
- Sustituir Google Sheets por otra capa de persistencia.
- Crear una arquitectura pensada para una migración posterior a otro stack.

---

## Estilo de cambios esperado

Cuando trabajes sobre este repo:

- haz cambios concretos, no solo recomendaciones
- prioriza archivos realmente útiles para el runtime
- mantén nombres claros y coherentes
- evita dependencias innecesarias
- deja siempre el proyecto en un estado más utilizable que antes

---

## Prioridades de evolución sugeridas

1. panel de administración básico dentro de Apps Script
2. CRUD sencillo para pantallas, contenidos y asignaciones
3. soporte de grupos de pantallas
4. vista previa de playlist por pantalla
5. mejora de seguridad de acceso y control de usuarios
6. uso de Drive con URLs/control de permisos más robusto

---

## Resumen operativo

Si eres Codex y vas a editar este repositorio, actúa con esta mentalidad:

> Este proyecto debe seguir siendo un proyecto de Google Apps Script puro, con sincronización directa desde GitHub, estructura simple, runtime en raíz y cero toolchains innecesarios.
