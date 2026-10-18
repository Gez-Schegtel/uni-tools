<script lang="ts">
  import {
    getNodeDimensions,
    getComponentPins,
    getPinWorldPosition,
    computeOrthogonalRoute,
    computeOrthogonalPoints,
    getWireSegments,
    getWireCorners,
    getGateSvgPath,
    getXorBackArc,
    type PinInfo,
    type WireSegment
  } from "./canvas/geometry.ts";
  import { simulate, idxSalida } from "../core/logic/simulator.ts";
  import type { Punto } from "../core/routing/orthogonal.ts";

  interface Props {
    herramientaActiva: "bloque" | "simulador" | "senales";
    nodos: any[];
    conexiones: any[];
    elementoSeleccionado: any | null;
    modoActual: "select" | "connect";
    zoom: number;
    pan: { x: number; y: number };
    onSeleccionarElemento: (elem: any | null) => void;
    onMoverElemento: (id: string, x: number, y: number) => void;
    onActualizarVista: (pan: { x: number; y: number }, zoom: number) => void;
    onCrearConexion: (
      desdeId: string,
      hastaId: string,
      desdePin?: string | number,
      hastaPin?: string | number,
      extra?: { branchFrom?: string; branchPt?: Punto }
    ) => void;
    onToggleNodo?: (id: string) => void;
    onModificarConexion?: (id: string, prop: string, valor: any) => void;
  }

  let {
    herramientaActiva,
    nodos,
    conexiones,
    elementoSeleccionado,
    modoActual,
    zoom = $bindable(),
    pan = $bindable(),
    onSeleccionarElemento,
    onMoverElemento,
    onActualizarVista,
    onCrearConexion,
    onToggleNodo,
    onModificarConexion
  }: Props = $props();

  // Estados de interacción
  let arrastrandoLienzo = $state(false);
  let arrastrandoNodo: any | null = $state(null);
  let inicioArrastre = { x: 0, y: 0 };
  let offsetNodo = { x: 0, y: 0 };

  // Manipulación de tramos de cable
  let arrastrandoSegmento: {
    conexionId: string;
    isVertical: boolean;
    inicioMouseW: Punto;
    inicioVal: number;
  } | null = $state(null);

  // Pines, esquinas y bifurcaciones
  let hoverNodoId: string | null = $state(null);
  let hoverWireId: string | null = $state(null);
  let hoverPin: { nodeId: string; pin: PinInfo } | null = $state(null);
  let conectando: {
    nodoId: string;
    pin: PinInfo;
    origenPt: Punto;
    actualPt: Punto;
    branchFrom?: string;
    branchPt?: Punto;
  } | null = $state(null);

  // Simulación en tiempo real
  const simResultado = $derived.by(() => {
    if (herramientaActiva === "simulador") {
      try {
        return simulate(nodos, conexiones);
      } catch (err) {
        console.warn("Fallo en simulación lógica:", err);
      }
    }
    return null;
  });

  // Conversión de coordenadas pantalla -> mundo SVG
  function toWorld(clientX: number, clientY: number, svgRect: DOMRect): Punto {
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
    if (e.button === 1 || e.buttons === 4 || e.spaceKey) {
      arrastrandoLienzo = true;
      inicioArrastre = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

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

    const svg = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mouseW = toWorld(e.clientX, e.clientY, svg);

    // 1. Moviendo segmento de cable (quiebre ortogonal)
    if (arrastrandoSegmento) {
      const conn = conexiones.find(c => c.id === arrastrandoSegmento!.conexionId);
      if (conn) {
        if (arrastrandoSegmento.isVertical) {
          const deltaX = mouseW.x - arrastrandoSegmento.inicioMouseW.x;
          conn.manualMidX = Math.round((arrastrandoSegmento.inicioVal + deltaX) / 10) * 10;
        } else {
          const deltaY = mouseW.y - arrastrandoSegmento.inicioMouseW.y;
          conn.manualMidY = Math.round((arrastrandoSegmento.inicioVal + deltaY) / 10) * 10;
        }
        if (onModificarConexion) {
          onModificarConexion(conn.id, arrastrandoSegmento.isVertical ? "manualMidX" : "manualMidY", arrastrandoSegmento.isVertical ? conn.manualMidX : conn.manualMidY);
        }
      }
      return;
    }

    // 2. Trazando cable o bifurcación
    if (conectando) {
      conectando.actualPt = mouseW;
      return;
    }

    // 3. Arrastrando nodo
    if (arrastrandoNodo) {
      const nuevoX = Math.round((mouseW.x - offsetNodo.x) / 20) * 20;
      const nuevoY = Math.round((mouseW.y - offsetNodo.y) / 20) * 20;
      onMoverElemento(arrastrandoNodo.id, nuevoX, nuevoY);
    }
  }

  function handlePointerUp() {
    arrastrandoLienzo = false;
    arrastrandoNodo = null;
    arrastrandoSegmento = null;

    if (conectando) {
      if (hoverPin && hoverPin.nodeId !== conectando.nodoId) {
        crearEnlaceEntrePines(
          conectando.nodoId,
          conectando.pin,
          hoverPin.nodeId,
          hoverPin.pin,
          conectando.branchFrom ? { branchFrom: conectando.branchFrom, branchPt: conectando.branchPt } : undefined
        );
      }
      conectando = null;
    }
  }

  function handleNodePointerDown(e: PointerEvent, n: any) {
    e.stopPropagation();

    if (modoActual === "connect") {
      if (!conectando) {
        const pins = getComponentPins(n);
        const outPin = pins.find(p => p.type === "out") || pins[0];
        if (outPin) {
          const pinPos = { x: n.x + outPin.x, y: n.y + outPin.y };
          conectando = {
            nodoId: n.id,
            pin: outPin,
            origenPt: pinPos,
            actualPt: pinPos
          };
        }
      } else if (conectando.nodoId !== n.id) {
        const pins = getComponentPins(n);
        const inPin = pins.find(p => p.type === "in") || pins[0];
        if (inPin) {
          crearEnlaceEntrePines(
            conectando.nodoId,
            conectando.pin,
            n.id,
            inPin,
            conectando.branchFrom ? { branchFrom: conectando.branchFrom, branchPt: conectando.branchPt } : undefined
          );
        }
        conectando = null;
      }
      return;
    }

    onSeleccionarElemento(n);
    arrastrandoNodo = n;

    const svg = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    const w = toWorld(e.clientX, e.clientY, svg);
    offsetNodo = { x: w.x - n.x, y: w.y - n.y };
  }

  function handlePinPointerDown(e: PointerEvent, n: any, p: PinInfo) {
    e.stopPropagation();
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    const mouseW = toWorld(e.clientX, e.clientY, svg);
    const pinPos = { x: n.x + p.x, y: n.y + p.y };

    conectando = {
      nodoId: n.id,
      pin: p,
      origenPt: pinPos,
      actualPt: mouseW
    };
  }

  function handleCornerPointerDown(e: PointerEvent, conn: any, cornerPt: Punto) {
    e.stopPropagation();
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    const mouseW = toWorld(e.clientX, e.clientY, svg);

    conectando = {
      nodoId: conn.from?.id || conn.de,
      pin: { id: "out:" + (conn.from?.pin || "o"), type: "out", index: conn.from?.pin || "o", x: 0, y: 0 },
      branchFrom: conn.id,
      branchPt: cornerPt,
      origenPt: cornerPt,
      actualPt: mouseW
    };
  }

  function handleSegmentPointerDown(e: PointerEvent, conn: any, seg: WireSegment) {
    e.stopPropagation();
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
    const mouseW = toWorld(e.clientX, e.clientY, svg);

    arrastrandoSegmento = {
      conexionId: conn.id,
      isVertical: seg.isVertical,
      inicioMouseW: mouseW,
      inicioVal: seg.isVertical ? (conn.manualMidX ?? seg.mid.x) : (conn.manualMidY ?? seg.mid.y)
    };
  }

  function crearEnlaceEntrePines(
    idA: string,
    pinA: PinInfo,
    idB: string,
    pinB: PinInfo,
    extra?: { branchFrom?: string; branchPt?: Punto }
  ) {
    if (pinA.type === "out" && pinB.type !== "out") {
      onCrearConexion(idA, idB, pinA.index, pinB.index, extra);
    } else if (pinB.type === "out" && pinA.type !== "out") {
      onCrearConexion(idB, idA, pinB.index, pinA.index, extra);
    } else {
      onCrearConexion(idA, idB, pinA.index, pinB.index, extra);
    }
  }

  function handleToggleSwitch(e: MouseEvent, n: any) {
    e.stopPropagation();
    if (onToggleNodo) {
      onToggleNodo(n.id);
    } else {
      n.on = !n.on;
      onMoverElemento(n.id, n.x, n.y);
    }
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

      <!-- Punta de flecha para bloques y señales -->
      <marker
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--diagram-wire)" />
      </marker>

      <!-- Punta de flecha activa -->
      <marker
        id="arrowhead-active"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--color-success)" />
      </marker>
    </defs>

    <!-- Fondo de grilla infinita -->
    <rect id="canvas-bg" width="100%" height="100%" fill="url(#dot-grid)" />

    <!-- Capa de transformación mundo (Pan & Zoom) -->
    <g transform="translate({pan.x}, {pan.y}) scale({zoom})">
      <!-- Capa de Conexiones / Cables Ortogonales Cuadrados -->
      <g class="layer-wires">
        {#each conexiones as c}
          {@const n1 = nodos.find(n => n.id === (c.from?.id || c.de))}
          {@const n2 = nodos.find(n => n.id === (c.to?.id || c.a))}
          {#if n1 && n2}
            {@const p2Info = getPinWorldPosition(n2, c.to?.pin ?? c.to?.port, "in")}
            {@const p1Info = c.branchPt ? { pt: c.branchPt, dir: { x: p2Info.pt.x >= c.branchPt.x ? 1 : -1, y: 0 } } : getPinWorldPosition(n1, c.from?.pin ?? c.from?.port, "out")}
            {@const wirePts = computeOrthogonalPoints(p1Info.pt, p2Info.pt, p1Info.dir, p2Info.dir, c.manualMidX, c.manualMidY)}
            {@const routeD = computeOrthogonalRoute(p1Info.pt, p2Info.pt, p1Info.dir, p2Info.dir, c.manualMidX, c.manualMidY)}
            {@const selWire = elementoSeleccionado?.id === c.id}
            {@const isHoveredWire = hoverWireId === c.id || selWire}
            {@const outIdx = idxSalida(c.from?.pin || "o")}
            {@const sigVal = simResultado?.val.get(n1.id + "#" + outIdx) ?? 0}
            {@const isHigh = herramientaActiva === 'simulador' && sigVal === 1}
            {@const segments = getWireSegments(wirePts)}
            {@const corners = getWireCorners(wirePts)}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <g
              class="wire-group {selWire ? 'selected' : ''}"
              onclick={(e) => { e.stopPropagation(); onSeleccionarElemento(c); }}
              onpointerenter={() => hoverWireId = c.id}
              onpointerleave={() => { if (hoverWireId === c.id) hoverWireId = null; }}
            >
              <!-- Hitbox amplio transparente para clic -->
              <path
                d={routeD}
                fill="none"
                stroke="transparent"
                stroke-width="16"
                cursor="pointer"
              />

              <!-- Halo de selección -->
              {#if selWire}
                <path
                  d={routeD}
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="6"
                  stroke-opacity="0.35"
                />
              {/if}

              <!-- Cable ortogonal cuadrado a 90° sin curvas redondeadas -->
              <path
                d={routeD}
                fill="none"
                stroke={isHigh ? "var(--color-success)" : selWire ? "var(--accent)" : "var(--diagram-wire)"}
                stroke-width={isHigh ? "2.6" : "2"}
                marker-end={herramientaActiva !== 'simulador' ? (isHigh ? "url(#arrowhead-active)" : "url(#arrowhead)") : undefined}
                class="wire-path {isHigh ? 'energized' : ''}"
              />

              <!-- Punto de soldadura si este cable nace de una bifurcación -->
              {#if c.branchPt}
                <circle
                  cx={c.branchPt.x}
                  cy={c.branchPt.y}
                  r="4.5"
                  fill={isHigh ? "var(--color-success)" : "var(--diagram-wire)"}
                  stroke="var(--bg-surface)"
                  stroke-width="1.5"
                />
              {/if}

              <!-- Manijas interactivas en el centro de cada tramo (mover líneas) -->
              {#if isHoveredWire}
                {#each segments as seg}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <g
                    class="segment-handle"
                    transform="translate({seg.mid.x}, {seg.mid.y})"
                    onpointerdown={(e) => handleSegmentPointerDown(e, c, seg)}
                  >
                    {#if seg.isVertical}
                      <rect
                        x="-4"
                        y="-12"
                        width="8"
                        height="24"
                        rx="3"
                        fill="var(--accent)"
                        cursor="ew-resize"
                      />
                    {:else}
                      <rect
                        x="-12"
                        y="-4"
                        width="24"
                        height="8"
                        rx="3"
                        fill="var(--accent)"
                        cursor="ns-resize"
                      />
                    {/if}
                  </g>
                {/each}

                <!-- Manijas de esquinas a 90° (para arrastrar y abrir bifurcaciones) -->
                {#each corners as corn}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <circle
                    cx={corn.pt.x}
                    cy={corn.pt.y}
                    r="5.5"
                    fill="var(--accent)"
                    stroke="#ffffff"
                    stroke-width="1.5"
                    cursor="crosshair"
                    class="corner-branch-dot"
                    title="Arrastra desde esta esquina para abrir una bifurcación"
                    onpointerdown={(e) => handleCornerPointerDown(e, c, corn.pt)}
                  />
                {/each}
              {/if}

              <!-- Etiqueta de función o valor -->
              {#if c.g || c.label}
                {@const midX = (p1Info.pt.x + p2Info.pt.x) / 2}
                {@const midY = (p1Info.pt.y + p2Info.pt.y) / 2}
                <rect
                  x={midX - 16}
                  y={midY - 18}
                  width="32"
                  height="16"
                  rx="3"
                  fill="var(--bg-surface)"
                  stroke="var(--border-subtle)"
                  stroke-width="1"
                />
                <text
                  x={midX}
                  y={midY - 7}
                  font-size="11"
                  fill="var(--text-main)"
                  text-anchor="middle"
                  font-family="monospace"
                >
                  {c.g || c.label}
                </text>
              {/if}
            </g>
          {/if}
        {/each}

        <!-- Previsualización dinámica de cable o bifurcación en trazado (100% cuadrada) -->
        {#if conectando}
          <path
            d={computeOrthogonalRoute(
              conectando.origenPt,
              conectando.actualPt,
              conectando.pin.dir || { x: 1, y: 0 },
              { x: -1, y: 0 }
            )}
            fill="none"
            stroke="var(--accent)"
            stroke-width="2.5"
            stroke-dasharray="5 4"
            class="connecting-guide"
          />
          {#if conectando.branchPt}
            <circle
              cx={conectando.branchPt.x}
              cy={conectando.branchPt.y}
              r="5"
              fill="var(--accent)"
            />
          {/if}
        {/if}
      </g>

      <!-- Capa de Nodos y Componentes -->
      <g class="layer-nodes">
        {#each nodos as n}
          {@const sel = elementoSeleccionado?.id === n.id}
          {@const dims = getNodeDimensions(n)}
          {@const pins = getComponentPins(n)}
          {@const isHoveredNode = hoverNodoId === n.id || modoActual === 'connect' || conectando !== null}

          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <g
            class="node-group {sel ? 'selected' : ''}"
            transform="translate({n.x}, {n.y})"
            onpointerdown={(e) => handleNodePointerDown(e, n)}
            onpointerenter={() => hoverNodoId = n.id}
            onpointerleave={() => { if (hoverNodoId === n.id) hoverNodoId = null; }}
          >
            <!-- 1. SUMADOR CIRCULAR (Bloques de Control) -->
            {#if n.type === 'sum'}
              <circle
                r={dims.w / 2}
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "1.8"}
              />
              <line x1="-16" y1="-16" x2="16" y2="16" stroke="var(--diagram-node-stroke)" stroke-width="1.2" />
              <line x1="16" y1="-16" x2="-16" y2="16" stroke="var(--diagram-node-stroke)" stroke-width="1.2" />
              {#if n.signs?.l}<text x="-12" y="1" font-size="11" text-anchor="middle" dominant-baseline="central" fill="var(--text-main)">{n.signs.l}</text>{/if}
              {#if n.signs?.t}<text x="0" y="-12" font-size="11" text-anchor="middle" dominant-baseline="central" fill="var(--text-main)">{n.signs.t}</text>{/if}
              {#if n.signs?.b}<text x="0" y="12" font-size="11" text-anchor="middle" dominant-baseline="central" fill="var(--text-main)">{n.signs.b}</text>{/if}

            <!-- 2. BIFURCACIÓN / PUNTO DE RAMIFICACIÓN DISCRETO -->
            {:else if n.type === 'node'}
              {@const valNode = simResultado?.val.get(n.id + "#0") ?? 0}
              <circle
                r="7"
                fill={valNode === 1 ? "var(--color-success)" : "var(--diagram-node-stroke)"}
                stroke={sel ? "var(--accent)" : "transparent"}
                stroke-width="2"
              />

            <!-- 3. INTERRUPTOR DE ENTRADA TOGGLE (Simulador) -->
            {:else if n.type === 'in'}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <rect
                x={-dims.w / 2}
                y={-dims.h / 2}
                width={dims.w}
                height={dims.h}
                rx="6"
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "1.8"}
                cursor="pointer"
                onclick={(e) => handleToggleSwitch(e, n)}
              />
              <!-- Track conmutador grande y sensible -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <rect
                x={-dims.w / 2 + 5}
                y={-dims.h / 2 + 5}
                width={dims.w - 10}
                height={dims.h - 10}
                rx="11"
                fill={n.on ? "var(--color-success)" : "#334155"}
                stroke={n.on ? "#16a34a" : "var(--border-subtle)"}
                stroke-width="1.5"
                class="switch-track"
                cursor="pointer"
                onclick={(e) => handleToggleSwitch(e, n)}
              />
              <!-- Knob botón deslizante -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <circle
                cx={n.on ? (dims.w / 2 - 16) : (-dims.w / 2 + 16)}
                cy="0"
                r="8"
                fill="#ffffff"
                class="switch-knob"
                cursor="pointer"
                onclick={(e) => handleToggleSwitch(e, n)}
              />
              <text
                x={n.on ? (-dims.w / 2 + 15) : (dims.w / 2 - 15)}
                y="1"
                font-size="11"
                font-weight="bold"
                text-anchor="middle"
                dominant-baseline="central"
                fill="#ffffff"
                pointer-events="none"
              >
                {n.on ? '1' : '0'}
              </text>
              <text
                x="0"
                y={dims.h / 2 + 14}
                font-size="11"
                font-weight="600"
                text-anchor="middle"
                fill="var(--text-main)"
              >
                {n.label || 'IN'}
              </text>

            <!-- 4. SONDA LED DE SALIDA (Simulador) -->
            {:else if n.type === 'out'}
              {@const val = simResultado?.val.get(n.id + "#0") ?? 0}
              <circle
                r="18"
                fill={val === 1 ? "var(--color-success)" : "#0f172a"}
                stroke={sel ? "var(--accent)" : val === 1 ? "#16a34a" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "2"}
                class="led-probe {val === 1 ? 'active' : ''}"
              />
              <text
                y="1"
                font-size="14"
                font-weight="bold"
                text-anchor="middle"
                dominant-baseline="central"
                fill={val === 1 ? "#ffffff" : "#64748b"}
              >
                {val}
              </text>
              <text
                x="0"
                y="30"
                font-size="11"
                font-weight="600"
                text-anchor="middle"
                fill="var(--text-main)"
              >
                {n.label || 'OUT'}
              </text>

            <!-- 5. GENERADOR DE RELOJ (Simulador) -->
            {:else if n.type === 'clk'}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <rect
                x={-dims.w / 2}
                y={-dims.h / 2}
                width={dims.w}
                height={dims.h}
                rx="6"
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "1.8"}
                cursor="pointer"
                onclick={(e) => handleToggleSwitch(e, n)}
              />
              <path
                d="M -16 6 L -16 -6 L 0 -6 L 0 6 L 16 6 L 16 -6"
                fill="none"
                stroke={n.on ? "var(--color-success)" : "var(--accent)"}
                stroke-width="2"
                pointer-events="none"
              />
              <text
                x="0"
                y={dims.h / 2 + 14}
                font-size="11"
                font-weight="600"
                text-anchor="middle"
                fill="var(--text-main)"
              >
                {n.label || 'CLK'}
              </text>

            <!-- 6. COMPUERTAS LÓGICAS ANSI/IEEE (AND, OR, XOR, NOT, NAND, NOR, XNOR) -->
            {:else if /^(and|nand|or|nor|xor|xnor|not|buf)$/.test(n.type)}
              <path
                d={getGateSvgPath(n.type, dims.w, dims.h)}
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "2"}
                stroke-linejoin="round"
              />
              {#if n.type === 'xor' || n.type === 'xnor'}
                <path
                  d={getXorBackArc(dims.w, dims.h)}
                  fill="none"
                  stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                  stroke-width={sel ? "2.5" : "2"}
                />
              {/if}
              {#if /^(nand|nor|xnor|not)$/.test(n.type)}
                <circle
                  cx={dims.w / 2 + 3.5}
                  cy="0"
                  r="3.5"
                  fill="var(--bg-surface)"
                  stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                  stroke-width="1.8"
                />
              {/if}
              <text
                y="1"
                font-size="11"
                font-weight="700"
                text-anchor="middle"
                dominant-baseline="central"
                fill="var(--text-muted)"
                opacity="0.8"
                pointer-events="none"
              >
                {n.type.toUpperCase()}
              </text>

            <!-- 7. BIESTABLES / FLIP-FLOPS (D, JK, T, SR) -->
            {:else if n.type === 'ff'}
              {@const kind = (n.kind || 'd').toUpperCase()}
              <rect
                x={-dims.w / 2}
                y={-dims.h / 2}
                width={dims.w}
                height={dims.h}
                rx="6"
                fill="var(--bg-surface)"
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width={sel ? "2.5" : "1.8"}
              />
              <!-- Encabezado con tipo de biestable -->
              <rect
                x={-dims.w / 2}
                y={-dims.h / 2}
                width={dims.w}
                height="22"
                rx="6"
                fill="var(--bg-subtle)"
              />
              <text
                x="0"
                y={-dims.h / 2 + 11}
                font-size="11"
                font-weight="bold"
                text-anchor="middle"
                dominant-baseline="central"
                fill="var(--text-muted)"
                letter-spacing="0.5"
              >
                FF-{kind}
              </text>
              <!-- Rótulos de pines y notch de reloj -->
              {#each pins as p}
                {#if p.type === 'in'}
                  {#if p.isClk}
                    <polygon
                      points="{-dims.w / 2},{p.y - 6} {-dims.w / 2 + 8},{p.y} {-dims.w / 2},{p.y + 6}"
                      fill="none"
                      stroke="var(--diagram-node-stroke)"
                      stroke-width="1.5"
                    />
                  {:else}
                    <text
                      x={-dims.w / 2 + 8}
                      y={p.y}
                      font-size="11"
                      font-weight="bold"
                      dominant-baseline="central"
                      fill="var(--text-main)"
                    >
                      {p.label || ''}
                    </text>
                  {/if}
                {:else if p.type === 'out'}
                  <text
                    x={dims.w / 2 - 8}
                    y={p.y}
                    font-size="11"
                    font-weight="bold"
                    text-anchor="end"
                    dominant-baseline="central"
                    fill="var(--text-main)"
                  >
                    {p.label || ''}
                  </text>
                {/if}
              {/each}

            <!-- 8. NODOS DE SEÑALES (SFG) -->
            {:else if n.tipo !== undefined}
              <circle
                r="9"
                fill={n.tipo === 'entrada' ? 'var(--accent)' : n.tipo === 'salida' ? 'var(--color-success)' : 'var(--bg-surface)'}
                stroke={sel ? "var(--accent)" : "var(--diagram-node-stroke)"}
                stroke-width="2"
              />
              <text y="-14" font-size="13" font-weight="600" text-anchor="middle" fill="var(--text-main)">
                {n.nombre || ''}
              </text>

            <!-- 9. BLOQUES DE CONTROL GENERALES -->
            {:else}
              <rect
                x={-dims.w / 2}
                y={-dims.h / 2}
                width={dims.w}
                height={dims.h}
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

            <!-- Stubs y Terminales Interactivos de Pines -->
            {#each pins as p}
              {@const bubbleOffset = /^(nand|nor|xnor|not)$/.test(n.type) && p.type === 'out' ? 7 : 0}
              {@const innerX = p.x > 0 ? (dims.w / 2 + bubbleOffset) : (-dims.w / 2)}
              {@const isHoveredPin = hoverPin?.nodeId === n.id && hoverPin?.pin.id === p.id}

              <!-- Línea física del stub hacia el puerto -->
              <line
                x1={p.x}
                y1={p.y}
                x2={innerX}
                y2={p.y}
                stroke="var(--diagram-node-stroke)"
                stroke-width="1.6"
              />

              <!-- Terminal circular interactivo con hover -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <g
                class="pin-terminal"
                transform="translate({p.x}, {p.y})"
                onpointerdown={(e) => handlePinPointerDown(e, n, p)}
                onpointerenter={() => hoverPin = { nodeId: n.id, pin: p }}
                onpointerleave={() => { if (hoverPin?.nodeId === n.id && hoverPin?.pin.id === p.id) hoverPin = null; }}
              >
                <circle r="12" fill="transparent" cursor="crosshair" />

                {#if isHoveredNode || isHoveredPin}
                  <circle
                    r={isHoveredPin ? 7.5 : 5.5}
                    fill={p.type === 'out' ? "var(--accent)" : "var(--color-info)"}
                    stroke="#ffffff"
                    stroke-width={isHoveredPin ? "2" : "1.2"}
                    class="pin-dot {isHoveredPin ? 'active' : ''}"
                  />
                {:else}
                  <circle
                    r="3.5"
                    fill="var(--diagram-node-stroke)"
                  />
                {/if}
              </g>
            {/each}

            <!-- Cuadro de selección discontinua alrededor del componente -->
            {#if sel}
              <rect
                x={-dims.w / 2 - 7}
                y={-dims.h / 2 - 7}
                width={dims.w + 14}
                height={dims.h + 14}
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

  .node-group:hover circle,
  .node-group:hover rect,
  .node-group:hover path {
    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.12));
  }

  .switch-track {
    transition: fill 0.15s ease;
  }

  .switch-knob {
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.25));
    transition: cx 0.15s ease;
  }

  .led-probe.active {
    filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.85));
  }

  .pin-terminal {
    cursor: crosshair;
  }

  .pin-dot {
    transition: r 0.15s ease, stroke-width 0.15s ease;
  }

  .pin-dot.active {
    filter: drop-shadow(0 0 4px var(--accent));
  }

  .wire-path {
    transition: stroke 0.1s ease;
  }

  .wire-path.energized {
    filter: drop-shadow(0 0 3px rgba(34, 197, 94, 0.6));
  }

  .segment-handle {
    opacity: 0.85;
    transition: opacity 0.15s ease;
  }

  .segment-handle:hover {
    opacity: 1;
    filter: drop-shadow(0 0 4px var(--accent));
  }

  .corner-branch-dot {
    transition: r 0.15s ease;
  }

  .corner-branch-dot:hover {
    r: 7.5;
    filter: drop-shadow(0 0 5px var(--accent));
  }

  .connecting-guide {
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    from {
      stroke-dashoffset: 18;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
