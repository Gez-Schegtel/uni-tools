<script lang="ts">
  import type { BloqueNodo, BloqueFlecha } from "../core/schemas/document.schema.ts";

  interface Props {
    nodos: any[];
    conexiones: any[];
    elementoSeleccionado: any | null;
    modoActual: "select" | "connect";
    zoom: number;
    pan: { x: number; y: number };
    onSeleccionarElemento: (elem: any | null) => void;
    onMoverElemento: (id: string, x: number, y: number) => void;
    onActualizarVista: (pan: { x: number; y: number }, zoom: number) => void;
    onCrearConexion: (desdeId: string, hastaId: string) => void;
  }

  let {
    nodos,
    conexiones,
    elementoSeleccionado,
    modoActual,
    zoom = $bindable(),
    pan = $bindable(),
    onSeleccionarElemento,
    onMoverElemento,
    onActualizarVista,
    onCrearConexion
  }: Props = $props();

  let arrastrandoLienzo = $state(false);
  let arrastrandoNodo: any | null = $state(null);
  let inicioArrastre = { x: 0, y: 0 };
  let offsetNodo = { x: 0, y: 0 };
  let conectandoDesde: any | null = $state(null);

  // Conversión de coordenadas pantalla a mundo
  function toWorld(clientX: number, clientY: number, svgRect: DOMRect) {
    return {
      x: (clientX - svgRect.left - pan.x) / zoom,
      y: (clientY - svgRect.top - pan.y) / zoom
    };
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const nuevoZoom = Math.min(Math.max(zoom * factor, 0.2), 4.0);

    const svg = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mouseX = e.clientX - svg.left;
    const mouseY = e.clientY - svg.top;

    const nuevoPan = {
      x: mouseX - (mouseX - pan.x) * (nuevoZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (nuevoZoom / zoom)
    };

    pan = nuevoPan;
    zoom = nuevoZoom;
    onActualizarVista(pan, zoom);
  }

  function handlePointerDown(e: PointerEvent) {
    // Si apretó botón central o barra espaciadora -> paneo
    if (e.button === 1 || e.buttons === 4 || e.spaceKey) {
      arrastrandoLienzo = true;
      inicioArrastre = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    // Clic en el fondo del lienzo
    if ((e.target as SVGElement).id === "canvas-bg") {
      onSeleccionarElemento(null);
      arrastrandoLienzo = true;
      inicioArrastre = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (arrastrandoLienzo) {
      pan = { x: e.clientX - inicioArrastre.x, y: e.clientY - inicioArrastre.y };
      onActualizarVista(pan, zoom);
      return;
    }

    if (arrastrandoNodo) {
      const svg = (e.currentTarget as SVGElement).getBoundingClientRect();
      const w = toWorld(e.clientX, e.clientY, svg);
      const nuevoX = Math.round((w.x - offsetNodo.x) / 20) * 20;
      const nuevoY = Math.round((w.y - offsetNodo.y) / 20) * 20;
      onMoverElemento(arrastrandoNodo.id, nuevoX, nuevoY);
    }
  }

  function handlePointerUp() {
    arrastrandoLienzo = false;
    arrastrandoNodo = null;
    conectandoDesde = null;
  }

  function handleNodePointerDown(e: PointerEvent, n: any) {
    e.stopPropagation();

    if (modoActual === "connect") {
      if (!conectandoDesde) {
        conectandoDesde = n;
      } else if (conectandoDesde.id !== n.id) {
        onCrearConexion(conectandoDesde.id, n.id);
        conectandoDesde = null;
      }
      return;
    }

    onSeleccionarElemento(n);
    arrastrandoNodo = n;

    const svg = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    const w = toWorld(e.clientX, e.clientY, svg);
    offsetNodo = { x: w.x - n.x, y: w.y - n.y };
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="canvas-container">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg
    id="canvas-svg"
    class="canvas-svg"
    onwheel={handleWheel}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
  >
    <defs>
      <!-- Grilla sutil de puntos -->
      <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="var(--grid-dot)" />
      </pattern>
      <!-- Marcador de punta de flecha -->
      <marker
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--diagram-wire)" />
      </marker>
    </defs>

    <!-- Fondo de grilla infinita -->
    <rect id="canvas-bg" width="100%" height="100%" fill="url(#dot-grid)" />

    <!-- Capa de transformación mundo (Pan & Zoom) -->
    <g transform="translate({pan.x}, {pan.y}) scale({zoom})">
      <!-- Capa de Conexiones / Cables -->
      <g class="layer-wires">
        {#each conexiones as c}
          {@const n1 = nodos.find(n => n.id === (c.from?.id || c.de))}
          {@const n2 = nodos.find(n => n.id === (c.to?.id || c.a))}
          {#if n1 && n2}
            <line
              x1={n1.x}
              y1={n1.y}
              x2={n2.x}
              y2={n2.y}
              stroke="var(--diagram-wire)"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
            {#if c.g || c.label}
              <text
                x={(n1.x + n2.x) / 2}
                y={(n1.y + n2.y) / 2 - 8}
                font-size="12"
                fill="var(--text-main)"
                text-anchor="middle"
                font-family="monospace"
              >
                {c.g || c.label}
              </text>
            {/if}
          {/if}
        {/each}
      </g>

      <!-- Capa de Nodos y Componentes -->
      <g class="layer-nodes">
        {#each nodos as n}
          {@const sel = elementoSeleccionado?.id === n.id}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <g
            class="node-group {sel ? 'selected' : ''}"
            transform="translate({n.x}, {n.y})"
            onpointerdown={(e) => handleNodePointerDown(e, n)}
          >
            {#if n.type === 'sum'}
              <!-- Sumador circular -->
              <circle
                r="24"
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "1.8"}
              />
              <line x1="-16" y1="-16" x2="16" y2="16" stroke="var(--diagram-node-stroke)" stroke-width="1.2" />
              <line x1="16" y1="-16" x2="-16" y2="16" stroke="var(--diagram-node-stroke)" stroke-width="1.2" />
              {#if n.signs?.l}<text x="-12" y="1" font-size="11" text-anchor="middle" dominant-baseline="central" fill="var(--text-main)">{n.signs.l}</text>{/if}
              {#if n.signs?.t}<text x="0" y="-12" font-size="11" text-anchor="middle" dominant-baseline="central" fill="var(--text-main)">{n.signs.t}</text>{/if}
              {#if n.signs?.b}<text x="0" y="12" font-size="11" text-anchor="middle" dominant-baseline="central" fill="var(--text-main)">{n.signs.b}</text>{/if}
            {:else if n.type === 'node'}
              <!-- Bifurcación punto -->
              <circle
                r="5"
                fill={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
              />
            {:else if n.tipo}
              <!-- Nodo de Señales (SFG) -->
              <circle
                r="8"
                fill={n.tipo === 'entrada' ? 'var(--accent)' : n.tipo === 'salida' ? 'var(--color-success)' : 'var(--bg-surface)'}
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width="2"
              />
              <text y="-14" font-size="13" font-weight="600" text-anchor="middle" fill="var(--text-main)">
                {n.nombre || ''}
              </text>
            {:else}
              <!-- Bloque o compuerta rectangular -->
              <rect
                x={-(n.w || 72) / 2}
                y={-(n.h || 42) / 2}
                width={n.w || 72}
                height={n.h || 42}
                rx="6"
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "1.8"}
              />
              <text
                font-size={n.font || 14}
                font-weight="600"
                text-anchor="middle"
                dominant-baseline="central"
                fill="var(--text-main)"
              >
                {n.label || n.type || ''}
              </text>
            {/if}

            {#if sel}
              <rect
                x={-(n.w || 72) / 2 - 5}
                y={-(n.h || 42) / 2 - 5}
                width={(n.w || 72) + 10}
                height={(n.h || 42) + 10}
                rx="8"
                fill="none"
                stroke="var(--accent)"
                stroke-width="1.2"
                stroke-dasharray="3 3"
              />
            {/if}
          </g>
        {/each}
      </g>
    </g>
  </svg>
</div>

<style>
  .canvas-container {
    flex: 1;
    height: 100%;
    position: relative;
    background-color: var(--bg-canvas);
    overflow: hidden;
  }

  .canvas-svg {
    width: 100%;
    height: 100%;
    cursor: default;
    touch-action: none;
  }

  .node-group {
    cursor: move;
  }

  .node-group:hover circle, .node-group:hover rect {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  }
</style>
