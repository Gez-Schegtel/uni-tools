# Spec 50 — `src/sitio.js` no Borra lo que no Debe

- **ID:** `SPEC-50`
- **Estado:** ✅ Completada
- **Origen:** Auditoría de seguridad del 2026-11-03 (segunda parte)
- **Prioridad:** Alta (el daño es irreversible, aunque haga falta equivocarse al escribir el comando)
- **Esfuerzo estimado:** Muy bajo (~15 minutos)
- **Archivos afectados:** `src/sitio.js`, `tests/specs/fuentes.spec.js`

---

## 1. Historia de Usuario

> **Como** quien arma el sitio a mano para probarlo,
> **quiero** que un error de tipeo en la carpeta destino no me borre el repositorio,
> **para** no perder trabajo por un `..` de más.

---

## 2. Descripción del Problema

`node src/sitio.js <destino>` (SPEC-37) borra la carpeta destino antes de copiar el sitio. Sólo se negaba si el destino era exactamente la raíz del repo: con `..`, con `/` o con cualquier carpeta que contenga al repo, la borraba entera.

Además, «falla si una página pide un archivo que no existe» no tenía prueba, porque la función sólo miraba la raíz real del repo.

---

## 3. Lo que se hizo

- Se rechaza cualquier destino que sea la raíz o la contenga (`path.relative(destino, raíz)` sin `..`), con el mensaje «el destino no puede ser la raíz del repo ni una carpeta que la contenga».
- `archivosDelSitio(raiz)` recibe la carpeta por parámetro y se exporta (el script sigue funcionando igual desde la línea de comandos y desde `static.yml`).

---

## 4. Plan de Pruebas

- `fuentes.spec.js`: con `.`, `..`, `/` y la carpeta padre del repo, el script falla sin borrar nada; con una página que pide un logo inexistente, `archivosDelSitio()` falla nombrando la página y el archivo, y con el logo presente devuelve sólo la página y el logo (ni los enlaces entre páginas ni lo de afuera).

---

## 5. Criterios de Aceptación

- [x] Ningún destino posible borra el repositorio.
- [x] El caso del archivo faltante está probado.
