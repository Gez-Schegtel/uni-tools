# Spec 56 — Modo Oscuro

- **ID:** `SPEC-56`
- **Estado:** ✅ Completada
- **Origen:** Pedido del dueño, 2026-11-03 («agregá un modo oscuro: que sea un botón que pase de una lunita a un sol; controlá que ningún menú quede opacado o poco visible»)
- **Prioridad:** Media
- **Esfuerzo estimado:** Alto (~2 horas)
- **Archivos afectados:** `src/comun/tema.css`, `src/comun/tema.html`, `src/comun/tema.js` (nuevos), `src/comun/base.css`, `src/comun/avisos.css`, `src/comun/colores.css`, `src/comun/marca-y-panel.html`, `src/*/estilos.css`, `src/*/pagina.html`, `src/simulador/tabla.js`, `index.html`, pruebas

---

## 1. Historia de Usuario

> **Como** estudiante que usa las herramientas de noche o muchas horas seguidas,
> **quiero** un modo oscuro que se active con un botón,
> **para** no tener una pantalla blanca encandilándome, sin perder nada de lo que se ve en claro.

---

## 2. Lo que se hizo

1. **El botón** (`comun/tema.html`): una luna en claro y un sol en oscuro, con un giro corto al cambiar (sin animación si el sistema pide menos movimiento). Va junto a la marca en bloques, simulador y señales, en la barra del LGR y arriba a la derecha en la portada. Mide lo mismo que los demás botones: la barra no cambió de alto.
2. **La elección** (`comun/tema.js`) se guarda en `uni-tools-tema`, la misma para todas las páginas, y se pasa a las otras pestañas abiertas (evento `storage`). Sin elección guardada, claro: quien no toca el botón ve todo como antes.
3. **Los tokens:** los colores de la interfaz que estaban fijos en el CSS (grises de rótulos, el borde de la herramienta activa, el texto sobre el azul, las sombras, el aviso, el fondo de la leyenda del LGR…) pasaron a variables con **los mismos valores**. Comprobado con 27 capturas de las cinco páginas (con selección, avisos, ayuda, Abrir, tabla de verdad, Mason, los pasos del LGR y un error): en claro quedaron **idénticas píxel por píxel**, salvo el ícono nuevo. `comun/tema.css` da los valores oscuros.
4. **El dibujo no cambia:** los tokens se declaran en `:root,svg#canvas`, así que el lienzo conserva los claros y en oscuro se muestra con `filter: invert(.9) hue-rotate(180deg)`: el negro se ve gris claro sobre casi negro y los colores mantienen su tono. El documento, los colores elegidos y **lo que se exporta (SVG y PNG) son idénticos** en los dos temas. Lo mismo para los íconos de la leyenda del LGR y la vista previa del equivalente en bloques de señales.
5. **Nada poco visible:** en oscuro, el texto sobre el azul es oscuro (contraste 6,6:1), los grises secundarios tienen 6,4:1 sobre el panel, el aviso es una tarjeta gris con borde, las ventanas tienen borde, la perilla de los interruptores del simulador es clara y la marca de la barra tiene un halo apenas claro; en la portada el logo (que es oscuro) va sobre una placa clara.

---

## 3. Plan de Pruebas

`tests/specs/tema.spec.js`:
- En las 5 páginas: arranca en claro con la luna, el botón pasa a oscuro con el sol (`aria-pressed`, `title`), se recuerda al recargar y vuelve a claro.
- La elección vale para todas las páginas y llega a una pestaña ya abierta.
- **Contraste:** en oscuro, todo texto visible fuera de los dibujos (barra con los menús desplegados, panel con y sin selección, paleta, cada ventana, avisos, los pasos y el error del LGR, la portada) tiene 4,5:1 o más contra lo que tiene detrás. Se comprobó que la prueba atrapa un gris apagado y un aviso de letras blancas sobre fondo claro.
- En oscuro el lienzo conserva los tokens claros y tiene el filtro, y el SVG exportado es idéntico al de claro (bloques, simulador, señales y LGR).

`fuentes.spec.js`: la portada usa la misma clave, la misma lógica y los mismos íconos que `comun/tema.*`.

---

## 4. Criterios de Aceptación

- [x] Un botón con una luna (claro) que pasa a un sol (oscuro), en las cinco páginas.
- [x] La elección se recuerda y es la misma en todas las páginas.
- [x] Ningún menú, panel, ventana o aviso queda poco visible en oscuro (contraste medido).
- [x] El modo claro se ve igual que antes.
- [x] Lo exportado y lo guardado no dependen del tema.
