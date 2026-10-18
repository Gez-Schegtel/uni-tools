<script lang="ts">
  interface Props {
    herramientaActiva: "bloque" | "simulador" | "senales";
    nombre: string;
    puedeDeshacer: boolean;
    puedeRehacer: boolean;
    temaActual: "light" | "dark";
    onCambiarHerramienta: (h: "bloque" | "simulador" | "senales") => void;
    onCambiarNombre: (nuevo: string) => void;
    onDeshacer: () => void;
    onRehacer: () => void;
    onAjustarVista: () => void;
    onAlternarTema: () => void;
    onExportar: (tipo: "svg" | "png" | "json") => void;
    onAbrir: () => void;
  }

  let {
    herramientaActiva,
    nombre,
    puedeDeshacer,
    puedeRehacer,
    temaActual,
    onCambiarHerramienta,
    onCambiarNombre,
    onDeshacer,
    onRehacer,
    onAjustarVista,
    onAlternarTema,
    onExportar,
    onAbrir
  }: Props = $props();

  let editandoNombre = $state(false);
  let menuExportarAbierto = $state(false);
</script>

<header class="app-header">
  <div class="header-left">
    <div class="brand">
      <img src="/uni-tools-logo.png" alt="Logo" class="brand-logo" />
      <span class="brand-title">uni-tools</span>
    </div>

    <div class="tool-switcher">
      <button
        class="switcher-pill {herramientaActiva === 'bloque' ? 'active' : ''}"
        onclick={() => onCambiarHerramienta('bloque')}
      >
        Bloques
      </button>
      <button
        class="switcher-pill {herramientaActiva === 'simulador' ? 'active' : ''}"
        onclick={() => onCambiarHerramienta('simulador')}
      >
        Simulador
      </button>
      <button
        class="switcher-pill {herramientaActiva === 'senales' ? 'active' : ''}"
        onclick={() => onCambiarHerramienta('senales')}
      >
        Señales
      </button>
    </div>
  </div>

  <div class="header-center">
    {#if editandoNombre}
      <input
        type="text"
        class="doc-title-input"
        value={nombre}
        onblur={(e) => {
          onCambiarNombre((e.target as HTMLInputElement).value);
          editandoNombre = false;
        }}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            onCambiarNombre((e.target as HTMLInputElement).value);
            editandoNombre = false;
          }
        }}
      />
    {:else}
      <button class="doc-title-btn ghost" onclick={() => editandoNombre = true} title="Hacer clic para renombrar">
        <span>{nombre}</span>
        <svg class="icon-edit" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    {/if}
  </div>

  <div class="header-right">
    <div class="btn-group">
      <button
        class="ghost"
        disabled={!puedeDeshacer}
        onclick={onDeshacer}
        title="Deshacer (Ctrl+Z)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
        </svg>
      </button>
      <button
        class="ghost"
        disabled={!puedeRehacer}
        onclick={onRehacer}
        title="Rehacer (Ctrl+Y)"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 14l5-5-5-5" />
          <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
        </svg>
      </button>
    </div>

    <button class="ghost" onclick={onAjustarVista} title="Ajustar vista a pantalla (F)">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    </button>

    <button class="ghost" onclick={onAbrir} title="Abrir archivo (Ctrl+O)">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
      </svg>
      <span>Abrir</span>
    </button>

    <div class="export-dropdown-wrapper">
      <button class="primary" onclick={() => menuExportarAbierto = !menuExportarAbierto}>
        <span>Exportar</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {#if menuExportarAbierto}
        <div class="dropdown-menu">
          <button class="dropdown-item" onclick={() => { onExportar('svg'); menuExportarAbierto = false; }}>
            Exportar SVG (Vectorial)
          </button>
          <button class="dropdown-item" onclick={() => { onExportar('png'); menuExportarAbierto = false; }}>
            Exportar PNG (3× Alta Resolución)
          </button>
          <button class="dropdown-item" onclick={() => { onExportar('json'); menuExportarAbierto = false; }}>
            Guardar JSON (Editable)
          </button>
        </div>
      {/if}
    </div>

    <button class="ghost theme-toggle" onclick={onAlternarTema} title="Alternar Modo Oscuro / Claro">
      {#if temaActual === 'dark'}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      {/if}
    </button>
  </div>
</header>

<style>
  .app-header {
    height: 52px;
    background-color: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 100;
    position: relative;
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 8px;
  }

  .brand-logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .brand-title {
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.02em;
  }

  .tool-switcher {
    display: flex;
    background-color: var(--bg-surface-active);
    padding: 3px;
    border-radius: 8px;
    gap: 2px;
  }

  .switcher-pill {
    border: none;
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 6px;
    color: var(--text-muted);
  }

  .switcher-pill.active {
    background-color: var(--bg-surface);
    color: var(--text-main);
    box-shadow: var(--shadow-sm);
  }

  .header-center {
    display: flex;
    align-items: center;
  }

  .doc-title-btn {
    font-weight: 600;
    font-size: 14px;
    padding: 4px 8px;
  }

  .doc-title-input {
    font-weight: 600;
    font-size: 14px;
    text-align: center;
    width: 220px;
  }

  .icon-edit {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .btn-group {
    display: flex;
    gap: 2px;
  }

  .export-dropdown-wrapper {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    padding: 4px;
    display: flex;
    flex-direction: column;
    min-width: 210px;
    z-index: 200;
  }

  .dropdown-item {
    border: none;
    background: transparent;
    width: 100%;
    justify-content: flex-start;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    color: var(--text-main);
  }

  .dropdown-item:hover {
    background-color: var(--bg-surface-hover);
  }
</style>
