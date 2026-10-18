<script lang="ts">
  interface Props {
    nodosCount: number;
    conexionesCount: number;
    seleccionTexto: string;
    zoom: number;
    guardadoOk: boolean;
    onResetZoom: () => void;
    onAbrirAyuda: () => void;
  }

  let {
    nodosCount,
    conexionesCount,
    seleccionTexto,
    zoom,
    guardadoOk,
    onResetZoom,
    onAbrirAyuda
  }: Props = $props();
</script>

<footer class="app-statusbar">
  <div class="status-left">
    <div class="stat-item">
      <span class="stat-label">Elementos:</span>
      <span class="stat-value">{nodosCount}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Conexiones:</span>
      <span class="stat-value">{conexionesCount}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item selection">
      <span class="stat-label">Selección:</span>
      <span class="stat-value">{seleccionTexto || "—"}</span>
    </div>
  </div>

  <div class="status-center">
    {#if guardadoOk}
      <div class="autosave-badge">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Guardado localmente</span>
      </div>
    {/if}
  </div>

  <div class="status-right">
    <button class="ghost zoom-btn" onclick={onResetZoom} title="Restablecer zoom a 100%">
      <span>{Math.round(zoom * 100)}%</span>
    </button>
    <button class="ghost help-btn" onclick={onAbrirAyuda} title="Ver atajos de teclado (?)">
      <kbd>?</kbd>
    </button>
  </div>
</footer>

<style>
  .app-statusbar {
    height: 28px;
    background-color: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    font-size: 12px;
    color: var(--text-muted);
    z-index: 40;
    user-select: none;
  }

  .status-left, .status-right, .status-center {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .stat-label {
    color: var(--text-subtle);
  }

  .stat-value {
    color: var(--text-main);
    font-weight: 500;
  }

  .stat-divider {
    width: 1px;
    height: 14px;
    background-color: var(--border-subtle);
  }

  .autosave-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--color-success);
    font-size: 11px;
    font-weight: 500;
  }

  .zoom-btn {
    border: none;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-main);
  }

  .help-btn {
    border: none;
    padding: 0;
  }

  kbd {
    font-size: 10px;
    padding: 1px 4px;
  }
</style>
