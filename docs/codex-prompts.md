# Prompts para Codex

Estos prompts están pensados para trabajar **sobre este repositorio** respetando `AGENTS.md`.

---

## 1. Crear panel admin básico

```text
Trabaja sobre el repositorio rodelri/cms.

Lee primero:
- AGENTS.md
- README.md
- docs/arquitectura.md
- Code.gs
- screen.html

Objetivo:
crear un panel de administración mínimo dentro del propio Apps Script.

Requisitos:
- mantener el proyecto como Apps Script puro
- no introducir React, TypeScript, Vite ni bundlers
- conservar el runtime en la raíz del repo
- crear una vista HTML para administración
- permitir listar pantallas desde la hoja PANTALLAS
- permitir listar contenidos desde CONTENIDOS
- permitir listar asignaciones desde ASIGNACIONES
- no romper el endpoint ?api=playlist&screen=...&token=...
- actualizar README.md y docs/arquitectura.md si cambian flujos

Haz cambios concretos en el repo, no solo recomendaciones.
Al final resume qué archivos has modificado y por qué.
```

---

## 2. Añadir CRUD simple de pantallas

```text
Trabaja sobre el repositorio rodelri/cms respetando AGENTS.md.

Quiero añadir CRUD básico para la hoja PANTALLAS dentro del panel admin Apps Script.

Requisitos:
- Apps Script puro
- sin frameworks ni bundlers
- formularios simples con HtmlService
- operaciones para crear, editar y activar/desactivar pantallas
- validar campos mínimos: ID_PANTALLA, NOMBRE, TOKEN, ACTIVA
- mantener compatibilidad con el runtime actual
- documentar cambios en README.md y docs/arquitectura.md si procede

Haz los cambios directamente en el repo.
```

---

## 3. Añadir grupos de pantallas

```text
Trabaja sobre el repositorio rodelri/cms respetando AGENTS.md.

Objetivo:
añadir soporte para grupos de pantallas sin romper el modelo actual.

Quiero que propongas e implementes una solución simple compatible con Apps Script y Google Sheets.

Condiciones:
- no introducir nuevas toolchains
- mantener runtime en raíz
- priorizar simplicidad del modelo de datos
- actualizar documentación
- mantener funcionando doGet y api=playlist

Haz los cambios en el repo y explica la decisión de diseño elegida.
```

---

## 4. Mejorar soporte de Drive para imágenes y vídeos

```text
Trabaja sobre el repositorio rodelri/cms respetando AGENTS.md.

Objetivo:
mejorar el manejo de recursos de Google Drive para contenidos IMAGE y VIDEO.

Quiero:
- revisar cómo se construyen las URLs desde FILE_ID
- mejorar la compatibilidad de reproducción
- mantener simple la implementación
- no introducir librerías externas
- documentar limitaciones reales de permisos de Drive

Haz cambios concretos en Code.gs y en la documentación si hace falta.
```

---

## 5. Añadir control de acceso al panel admin

```text
Trabaja sobre el repositorio rodelri/cms respetando AGENTS.md.

Objetivo:
proteger el futuro panel admin para que solo accedan usuarios autorizados.

Quiero una solución compatible con Google Apps Script y pensada para un colegio.

Requisitos:
- Apps Script puro
- sin dependencias externas
- simple de mantener
- compatible con cuentas del dominio del centro si es posible
- sin romper el modo pantalla pública

Haz cambios directos en el repo y explica brevemente la estrategia elegida.
```
