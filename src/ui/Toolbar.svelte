<script lang="ts">
  interface Props {
    herramientaActiva: "bloque" | "simulador" | "senales";
    modoActual: "select" | "connect";
    onCambiarModo: (modo: "select" | "connect") => void;
    onAgregarElemento: (tipo: string) => void;
    onBorrarSeleccion: () => void;
    tieneSeleccion: boolean;
  }

  let {
    herramientaActiva,
    modoActual,
    onCambiarModo,
    onAgregarElemento,
    onBorrarSeleccion,
    tieneSeleccion
  }: Props = $props();
</script>

<div class="floating-toolbar">
  <div class="tool-section">
    <button
      class="tool-btn {modoActual === 'select' ? 'active' : ''}"
      onclick={() => onCambiarModo('select')}
      title="Selección y arrastre (V)"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3l7 18 3-7 7-3L3 3z" />
      </svg>
      <kbd>V</kbd>
    </button>

    <button
      class="tool-btn {modoActual === 'connect' ? 'active' : ''}"
      onclick={() => onCambiarModo('connect')}
      title="Conectar elementos / Trazar cables (C)"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 9v3a6 6 0 0 0 6 6h3" />
      </svg>
      <kbd>C</kbd>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Componentes según la herramienta activa -->
  <div class="tool-section">
    {#if herramientaActiva === 'bloque'}
      <button class="tool-btn" onclick={() => onAgregarElemento('block')} title="Agregar Bloque de Control">
        <span class="icon-label">G(s)</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('sum')} title="Agregar Punto de Suma / Resta">
        <span class="icon-label">Σ</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('node')} title="Agregar Punto de Bifurcación">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
        </svg>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('io')} title="Agregar Entrada/Salida R(s)">
        <span class="icon-label">I/O</span>
      </button>
    {:else if herramientaActiva === 'simulador'}
      <!-- Entradas y Salidas -->
      <button class="tool-btn" onclick={() => onAgregarElemento('in')} title="Interruptor de Entrada (0/1)">
        <span class="icon-label">IN</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('clk')} title="Generador de Reloj (Pulsos)">
        <span class="icon-label">CLK</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('out')} title="Sonda LED de Salida">
        <span class="icon-label">OUT</span>
      </button>

      <div class="divider"></div>

      <!-- Compuertas Lógicas -->
      <button class="tool-btn" onclick={() => onAgregarElemento('and')} title="Compuerta AND">
        <span class="icon-label">AND</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('or')} title="Compuerta OR">
        <span class="icon-label">OR</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('not')} title="Inversor NOT">
        <span class="icon-label">NOT</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('xor')} title="Compuerta XOR (O Exclusiva)">
        <span class="icon-label">XOR</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('nand')} title="Compuerta NAND">
        <span class="icon-label">NAND</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('nor')} title="Compuerta NOR">
        <span class="icon-label">NOR</span>
      </button>

      <div class="divider"></div>

      <!-- Biestables / Flip-Flops -->
      <button class="tool-btn" onclick={() => onAgregarElemento('ff-d')} title="Biestable / Flip-Flop D">
        <span class="icon-label">FF-D</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('ff-jk')} title="Biestable / Flip-Flop JK">
        <span class="icon-label">FF-JK</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('ff-t')} title="Biestable / Flip-Flop T">
        <span class="icon-label">FF-T</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('ff-sr')} title="Biestable / Flip-Flop RS">
        <span class="icon-label">FF-RS</span>
      </button>
    {:else if herramientaActiva === 'senales'}
      <button class="tool-btn" onclick={() => onAgregarElemento('normal')} title="Agregar Nodo de Señal">
        <span class="icon-label">x₁</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('entrada')} title="Marcar como Entrada">
        <span class="icon-label">In</span>
      </button>
      <button class="tool-btn" onclick={() => onAgregarElemento('salida')} title="Marcar como Salida">
        <span class="icon-label">Out</span>
      </button>
    {/if}

    <button class="tool-btn" onclick={() => onAgregarElemento('marco')} title="Recuadro de Agrupación (M)">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3">
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
      <kbd>M</kbd>
    </button>
  </div>

  {#if tieneSeleccion}
    <div class="divider"></div>
    <div class="tool-section">
      <button class="tool-btn danger" onclick={onBorrarSeleccion} title="Borrar Selección (Supr)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .floating-toolbar {
    position: absolute;
    top: 68px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    padding: 4px;
    gap: 4px;
    z-index: 50;
    backdrop-filter: blur(8px);
  }

  .tool-section {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .tool-btn {
    border: none;
    background: transparent;
    padding: 6px 10px;
    border-radius: 8px;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
  }

  .tool-btn:hover {
    background-color: var(--bg-surface-hover);
  }

  .tool-btn.active {
    background-color: var(--accent-surface);
    color: var(--accent);
  }

  .icon-label {
    font-family: ui-monospace, monospace;
    font-weight: 600;
    font-size: 13px;
  }

  .divider {
    width: 1px;
    height: 22px;
    background-color: var(--border-subtle);
    margin: 0 4px;
  }

  kbd {
    font-size: 10px;
    padding: 1px 4px;
  }
</style>
