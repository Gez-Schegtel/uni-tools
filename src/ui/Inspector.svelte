<script lang="ts">
  interface Props {
    elementoSeleccionado: any | null;
    herramientaActiva: "bloque" | "simulador" | "senales";
    onModificarElemento: (prop: string, valor: any) => void;
    onDuplicar: () => void;
    onBorrar: () => void;
    onAlinearGrilla: () => void;
  }

  let {
    elementoSeleccionado,
    herramientaActiva,
    onModificarElemento,
    onDuplicar,
    onBorrar,
    onAlinearGrilla
  }: Props = $props();

  const COLORES_PRESET = [
    "#ffffff", "#f8fafc", "#fef3c7", "#dcfce7", "#e0e7ff", "#fce7f3", "#fee2e2", "#101418"
  ];
</script>

<aside class="contextual-inspector">
  {#if elementoSeleccionado}
    <div class="inspector-header">
      <div class="elem-badge">
        <span class="badge-type">{elementoSeleccionado.type || elementoSeleccionado.tipo || 'Elemento'}</span>
        <span class="badge-id">#{elementoSeleccionado.id}</span>
      </div>
      <button class="ghost close-btn" onclick={() => elementoSeleccionado = null}>✕</button>
    </div>

    <div class="inspector-content">
      <!-- Etiqueta / Ecuación LaTeX -->
      <div class="inspector-card">
        <label for="label-inp" class="field-label">Etiqueta / Función</label>
        <input
          id="label-inp"
          type="text"
          class="field-input"
          value={elementoSeleccionado.label ?? elementoSeleccionado.nombre ?? elementoSeleccionado.g ?? ''}
          placeholder="ej: G1, K/(s+1), \omega_n"
          oninput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            if (elementoSeleccionado.label !== undefined) onModificarElemento('label', val);
            else if (elementoSeleccionado.nombre !== undefined) onModificarElemento('nombre', val);
            else if (elementoSeleccionado.g !== undefined) onModificarElemento('g', val);
          }}
        />
        <span class="field-hint">Soporta sintaxis LaTeX: K/(s+1), \omega_n, s^2</span>
      </div>

      <!-- Posición y Dimensiones -->
      {#if elementoSeleccionado.x !== undefined}
        <div class="inspector-card">
          <span class="card-title">Geometría</span>
          <div class="grid-row">
            <div class="field-group">
              <label for="x-inp" class="field-label">X</label>
              <input
                id="x-inp"
                type="number"
                class="field-input"
                step="20"
                value={Math.round(elementoSeleccionado.x)}
                onchange={(e) => onModificarElemento('x', +(e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="field-group">
              <label for="y-inp" class="field-label">Y</label>
              <input
                id="y-inp"
                type="number"
                class="field-input"
                step="20"
                value={Math.round(elementoSeleccionado.y)}
                onchange={(e) => onModificarElemento('y', +(e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          <button class="ghost snap-btn" onclick={onAlinearGrilla}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
            <span>Encajar en grilla (20px)</span>
          </button>
        </div>
      {/if}

      <!-- Opciones de Sumador (Bloques) -->
      {#if elementoSeleccionado.type === 'sum'}
        <div class="inspector-card">
          <span class="card-title">Signos de Entrada</span>
          <div class="grid-row">
            {#each ['l', 't', 'r', 'b'] as pos}
              <div class="field-group">
                <label for={"sign-" + pos} class="field-label">{pos.toUpperCase()}</label>
                <select
                  id={"sign-" + pos}
                  class="field-select"
                  value={elementoSeleccionado.signs?.[pos] || ''}
                  onchange={(e) => {
                    const signs = { ...elementoSeleccionado.signs, [pos]: (e.target as HTMLSelectElement).value };
                    onModificarElemento('signs', signs);
                  }}
                >
                  <option value="">Vacío</option>
                  <option value="+">+</option>
                  <option value="−">−</option>
                </select>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Opciones de Compuerta Lógica -->
      {#if /^(and|nand|or|nor|xor|xnor|not|buf)$/.test(elementoSeleccionado.type)}
        <div class="inspector-card">
          <span class="card-title">Configuración de Compuerta</span>
          <div class="grid-row">
            <div class="field-group">
              <label for="gate-type" class="field-label">Función Lógica</label>
              <select
                id="gate-type"
                class="field-select"
                value={elementoSeleccionado.type}
                onchange={(e) => {
                  const t = (e.target as HTMLSelectElement).value;
                  onModificarElemento('type', t);
                  onModificarElemento('label', t.toUpperCase());
                  if (t === 'not' || t === 'buf') onModificarElemento('pins', 1);
                }}
              >
                <option value="and">AND (&)</option>
                <option value="nand">NAND</option>
                <option value="or">OR (≥1)</option>
                <option value="nor">NOR</option>
                <option value="xor">XOR (=1)</option>
                <option value="xnor">XNOR</option>
                <option value="not">NOT (Inversor)</option>
                <option value="buf">BUFFER</option>
              </select>
            </div>
            {#if elementoSeleccionado.type !== 'not' && elementoSeleccionado.type !== 'buf'}
              <div class="field-group">
                <label for="gate-pins" class="field-label">Entradas</label>
                <select
                  id="gate-pins"
                  class="field-select"
                  value={elementoSeleccionado.pins || 2}
                  onchange={(e) => onModificarElemento('pins', +(e.target as HTMLSelectElement).value)}
                >
                  <option value={2}>2 entradas</option>
                  <option value={3}>3 entradas</option>
                  <option value={4}>4 entradas</option>
                  <option value={8}>8 entradas</option>
                </select>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Opciones de Biestable / Flip-Flop -->
      {#if elementoSeleccionado.type === 'ff'}
        <div class="inspector-card">
          <span class="card-title">Biestable / Flip-Flop</span>
          <div class="field-group">
            <label for="ff-kind" class="field-label">Tipo de Biestable</label>
            <select
              id="ff-kind"
              class="field-select"
              value={elementoSeleccionado.kind || 'd'}
              onchange={(e) => {
                const k = (e.target as HTMLSelectElement).value;
                onModificarElemento('kind', k);
                onModificarElemento('label', 'FF-' + k.toUpperCase());
              }}
            >
              <option value="d">Flip-Flop D (Dato)</option>
              <option value="jk">Flip-Flop JK</option>
              <option value="t">Flip-Flop T (Toggle)</option>
              <option value="sr">Flip-Flop RS / SR</option>
            </select>
          </div>
        </div>
      {/if}

      <!-- Opciones de Conmutador IN -->
      {#if elementoSeleccionado.type === 'in'}
        <div class="inspector-card">
          <span class="card-title">Estado e Interruptor</span>
          <div class="grid-row">
            <div class="field-group">
              <label for="in-state" class="field-label">Nivel Actual</label>
              <select
                id="in-state"
                class="field-select"
                value={elementoSeleccionado.on ? '1' : '0'}
                onchange={(e) => onModificarElemento('on', (e.target as HTMLSelectElement).value === '1')}
              >
                <option value="0">0 (Nivel Bajo / Low)</option>
                <option value="1">1 (Nivel Alto / High)</option>
              </select>
            </div>
            <div class="field-group">
              <label for="in-modo" class="field-label">Modo</label>
              <select
                id="in-modo"
                class="field-select"
                value={elementoSeleccionado.modo || 'toggle'}
                onchange={(e) => onModificarElemento('modo', (e.target as HTMLSelectElement).value)}
              >
                <option value="toggle">Conmutador</option>
                <option value="pulso">Pulsador</option>
              </select>
            </div>
          </div>
          <button
            class="action-btn"
            style="margin-top: 8px; width: 100%; justify-content: center;"
            onclick={() => onModificarElemento('on', !elementoSeleccionado.on)}
          >
            <span>Alternar Estado (Espacio)</span>
          </button>
        </div>
      {/if}

      <!-- Opciones de Sonda OUT -->
      {#if elementoSeleccionado.type === 'out'}
        <div class="inspector-card">
          <span class="card-title">Sonda de Salida</span>
          <div class="field-hint">
            Muestra el estado lógico calculado en tiempo real. Se ilumina con luz verde esmeralda ante nivel alto (1).
          </div>
        </div>
      {/if}

      <!-- Opciones de Cable / Conexión -->
      {#if elementoSeleccionado.from && elementoSeleccionado.to}
        <div class="inspector-card">
          <span class="card-title">Propiedades de Conexión</span>
          <div class="field-hint" style="line-height: 1.6;">
            <strong>Desde:</strong> #{elementoSeleccionado.from.id}:{elementoSeleccionado.from.pin ?? 'o'}<br />
            <strong>Hacia:</strong> #{elementoSeleccionado.to.id}:{elementoSeleccionado.to.pin ?? 0}
            {#if elementoSeleccionado.branchPt}
              <br /><strong>Bifurcación en:</strong> ({Math.round(elementoSeleccionado.branchPt.x)}, {Math.round(elementoSeleccionado.branchPt.y)})
            {/if}
          </div>
          <div class="grid-row" style="margin-top: 8px;">
            <div class="field-group">
              <label for="mid-x" class="field-label">Quiebre X</label>
              <input
                id="mid-x"
                type="number"
                class="field-input"
                step="10"
                value={elementoSeleccionado.manualMidX ?? ''}
                placeholder="Auto"
                onchange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  onModificarElemento('manualMidX', val === '' ? undefined : +val);
                }}
              />
            </div>
            <div class="field-group">
              <label for="mid-y" class="field-label">Desvío Y</label>
              <input
                id="mid-y"
                type="number"
                class="field-input"
                step="10"
                value={elementoSeleccionado.manualMidY ?? ''}
                placeholder="Auto"
                onchange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  onModificarElemento('manualMidY', val === '' ? undefined : +val);
                }}
              />
            </div>
          </div>
        </div>
      {/if}

      <!-- Paleta de Color -->
      <div class="inspector-card">
        <span class="card-title">Color de Resalte</span>
        <div class="color-palette">
          {#each COLORES_PRESET as col}
            <button
              class="color-dot {elementoSeleccionado.color === col ? 'selected' : ''}"
              style="background-color: {col}"
              onclick={() => onModificarElemento('color', col === '#ffffff' ? undefined : col)}
              title={col}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Acciones de Elemento -->
      <div class="inspector-actions">
        <button class="action-btn" onclick={onDuplicar} title="Duplicar (Ctrl+D)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Duplicar</span>
        </button>
        <button class="action-btn danger" onclick={onBorrar} title="Borrar (Supr)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
          <span>Borrar</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="inspector-empty">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p class="empty-title">Sin selección</p>
      <p class="empty-desc">
        Hacé clic en cualquier elemento, compuerta o conexión para editar sus propiedades.
      </p>
    </div>
  {/if}
</aside>

<style>
  .contextual-inspector {
    width: 280px;
    height: 100%;
    background-color: var(--bg-surface);
    border-left: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    z-index: 30;
    user-select: none;
    overflow-y: auto;
  }

  .inspector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .elem-badge {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .badge-type {
    font-weight: 600;
    font-size: 13px;
    text-transform: capitalize;
  }

  .badge-id {
    font-size: 11px;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  .close-btn {
    padding: 2px 6px;
  }

  .inspector-content {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .inspector-card {
    background-color: var(--bg-app);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }

  .field-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .field-input, .field-select {
    width: 100%;
  }

  .field-hint {
    font-size: 11px;
    color: var(--text-subtle);
  }

  .grid-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .snap-btn {
    width: 100%;
    margin-top: 4px;
    font-size: 11px;
    padding: 4px;
  }

  .color-palette {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 4px;
  }

  .color-dot {
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--border-strong);
    cursor: pointer;
  }

  .color-dot.selected {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .inspector-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 6px;
  }

  .action-btn {
    width: 100%;
  }

  .inspector-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
    text-align: center;
    color: var(--text-muted);
  }

  .empty-icon {
    color: var(--text-subtle);
    margin-bottom: 12px;
  }

  .empty-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-main);
    margin-bottom: 4px;
  }

  .empty-desc {
    font-size: 12px;
    line-height: 1.5;
  }
</style>
