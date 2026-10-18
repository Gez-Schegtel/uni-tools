<script lang="ts">
  import "./ui/theme.css";
  import Header from "./ui/Header.svelte";
  import Toolbar from "./ui/Toolbar.svelte";
  import Canvas from "./ui/Canvas.svelte";
  import Inspector from "./ui/Inspector.svelte";
  import StatusBar from "./ui/StatusBar.svelte";
  import { HistoryManager } from "./core/history/history.ts";

  type HerramientaTipo = "bloque" | "simulador" | "senales";

  // Estado reactivo con Svelte 5 runes
  let herramientaActiva = $state<HerramientaTipo>("bloque");
  let modoActual = $state<"select" | "connect">("select");
  let temaActual = $state<"light" | "dark">("light");
  let nombreDocumento = $state("mi-diagrama");

  // Estado del lienzo (Pan & Zoom)
  let zoom = $state(1.0);
  let pan = $state({ x: 100, y: 100 });

  // Elementos y conexiones
  let nodos = $state<any[]>([
    { id: "b1", type: "block", x: 200, y: 200, w: 72, h: 42, label: "G(s)" },
    { id: "s1", type: "sum", x: 360, y: 200, w: 50, h: 50, signs: { l: "+", t: "", r: "", b: "−" } }
  ]);
  let conexiones = $state<any[]>([
    { id: "c1", from: { id: "b1" }, to: { id: "s1" } }
  ]);

  let elementoSeleccionado = $state<any | null>(null);
  let uidCounter = $state(10);

  // Gestor de Historial
  const history = new HistoryManager<any>();
  let puedeDeshacer = $state(false);
  let puedeRehacer = $state(false);

  function snapshotState() {
    return {
      nodos: JSON.parse(JSON.stringify(nodos)),
      conexiones: JSON.parse(JSON.stringify(conexiones)),
      nombre: nombreDocumento
    };
  }

  function commitState() {
    history.commit(snapshotState());
    puedeDeshacer = history.canUndo();
    puedeRehacer = history.canRedo();
  }

  // Inicialización de tema y primer commit
  $effect(() => {
    document.documentElement.setAttribute("data-theme", temaActual);
  });

  $effect(() => {
    commitState();
  });

  // Operaciones de Historial
  function handleDeshacer() {
    const prev = history.undo();
    if (prev) {
      nodos = prev.nodos;
      conexiones = prev.conexiones;
      nombreDocumento = prev.nombre;
      puedeDeshacer = history.canUndo();
      puedeRehacer = history.canRedo();
      elementoSeleccionado = null;
    }
  }

  function handleRehacer() {
    const next = history.redo();
    if (next) {
      nodos = next.nodos;
      conexiones = next.conexiones;
      nombreDocumento = next.nombre;
      puedeDeshacer = history.canUndo();
      puedeRehacer = history.canRedo();
      elementoSeleccionado = null;
    }
  }

  function handleCambiarHerramienta(h: HerramientaTipo) {
    herramientaActiva = h;
    elementoSeleccionado = null;
    // Cargar plantilla por defecto según herramienta
    if (h === "bloque") {
      nodos = [
        { id: "b1", type: "block", x: 200, y: 200, w: 72, h: 42, label: "G(s)" },
        { id: "s1", type: "sum", x: 360, y: 200, w: 50, h: 50, signs: { l: "+", t: "", r: "", b: "−" } }
      ];
      conexiones = [{ id: "c1", from: { id: "b1" }, to: { id: "s1" } }];
    } else if (h === "simulador") {
      nodos = [
        { id: "in1", type: "in", x: 160, y: 180, label: "A", on: true },
        { id: "in2", type: "in", x: 160, y: 260, label: "B", on: false },
        { id: "and1", type: "and", x: 280, y: 220, w: 60, h: 44, label: "&" },
        { id: "out1", type: "out", x: 400, y: 220, label: "S" }
      ];
      conexiones = [
        { id: "w1", from: { id: "in1" }, to: { id: "and1" } },
        { id: "w2", from: { id: "in2" }, to: { id: "and1" } },
        { id: "w3", from: { id: "and1" }, to: { id: "out1" } }
      ];
    } else if (h === "senales") {
      nodos = [
        { id: "n1", nombre: "r", x: 160, y: 220, tipo: "entrada" },
        { id: "n2", nombre: "x1", x: 300, y: 220, tipo: "normal" },
        { id: "n3", nombre: "y", x: 440, y: 220, tipo: "salida" }
      ];
      conexiones = [
        { id: "r1", de: "n1", a: "n2", g: "G1" },
        { id: "r2", de: "n2", a: "n3", g: "1" }
      ];
    }
    commitState();
  }

  function handleAgregarElemento(tipo: string) {
    const id = "elem_" + ++uidCounter;
    const nuevo: any = {
      id,
      x: Math.round((-pan.x + 300) / 20) * 20,
      y: Math.round((-pan.y + 250) / 20) * 20
    };

    if (herramientaActiva === "bloque") {
      nuevo.type = tipo;
      nuevo.w = tipo === "sum" ? 50 : 72;
      nuevo.h = tipo === "sum" ? 50 : 42;
      nuevo.label = tipo === "block" ? "G" + uidCounter : tipo === "sum" ? "" : "X";
      if (tipo === "sum") nuevo.signs = { l: "+", t: "", r: "", b: "−" };
    } else if (herramientaActiva === "simulador") {
      nuevo.type = tipo;
      nuevo.label = tipo.toUpperCase();
      nuevo.w = 56;
      nuevo.h = 44;
    } else if (herramientaActiva === "senales") {
      nuevo.nombre = "x" + uidCounter;
      nuevo.tipo = tipo;
    }

    nodos = [...nodos, nuevo];
    elementoSeleccionado = nuevo;
    commitState();
  }

  function handleBorrarSeleccion() {
    if (!elementoSeleccionado) return;
    const id = elementoSeleccionado.id;
    nodos = nodos.filter(n => n.id !== id);
    conexiones = conexiones.filter(c => (c.from?.id !== id && c.to?.id !== id && c.de !== id && c.a !== id));
    elementoSeleccionado = null;
    commitState();
  }

  function handleDuplicar() {
    if (!elementoSeleccionado) return;
    const clon = JSON.parse(JSON.stringify(elementoSeleccionado));
    clon.id = "elem_" + ++uidCounter;
    clon.x = (clon.x || 0) + 40;
    clon.y = (clon.y || 0) + 40;
    nodos = [...nodos, clon];
    elementoSeleccionado = clon;
    commitState();
  }

  function handleMoverElemento(id: string, x: number, y: number) {
    const n = nodos.find(item => item.id === id);
    if (n) {
      n.x = x;
      n.y = y;
      nodos = [...nodos];
    }
  }

  function handleCrearConexion(desdeId: string, hastaId: string) {
    const nuevaConexion = {
      id: "conn_" + ++uidCounter,
      from: { id: desdeId },
      to: { id: hastaId },
      de: desdeId,
      a: hastaId,
      g: "1",
      label: ""
    };
    conexiones = [...conexiones, nuevaConexion];
    commitState();
  }

  function handleModificarElemento(prop: string, valor: any) {
    if (!elementoSeleccionado) return;
    elementoSeleccionado[prop] = valor;
    nodos = [...nodos];
    conexiones = [...conexiones];
    commitState();
  }

  // Atajos de Teclado Globales
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) handleRehacer();
      else handleDeshacer();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRehacer();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      handleDuplicar();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      handleBorrarSeleccion();
    } else if (e.key.toLowerCase() === "v") {
      modoActual = "select";
    } else if (e.key.toLowerCase() === "c") {
      modoActual = "connect";
    } else if (e.key.toLowerCase() === "f") {
      zoom = 1.0;
      pan = { x: 100, y: 100 };
    }
  }

  function handleExportar(tipo: "svg" | "png" | "json") {
    if (tipo === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshotState(), null, 2));
      const a = document.createElement("a");
      a.href = dataStr;
      a.download = `${nombreDocumento}.json`;
      a.click();
    } else {
      alert(`Exportación a ${tipo.toUpperCase()} lista para renderizado vectorial.`);
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="uni-tools-app">
  <Header
    {herramientaActiva}
    nombre={nombreDocumento}
    {puedeDeshacer}
    {puedeRehacer}
    {temaActual}
    onCambiarHerramienta={handleCambiarHerramienta}
    onCambiarNombre={(n) => nombreDocumento = n}
    onDeshacer={handleDeshacer}
    onRehacer={handleRehacer}
    onAjustarVista={() => { zoom = 1.0; pan = { x: 100, y: 100 }; }}
    onAlternarTema={() => temaActual = temaActual === "light" ? "dark" : "light"}
    onExportar={handleExportar}
    onAbrir={() => alert("Función para abrir archivo JSON/SVG.")}
  />

  <div class="workspace-body">
    <Toolbar
      {herramientaActiva}
      {modoActual}
      onCambiarModo={(m) => modoActual = m}
      onAgregarElemento={handleAgregarElemento}
      onBorrarSeleccion={handleBorrarSeleccion}
      tieneSeleccion={elementoSeleccionado !== null}
    />

    <Canvas
      {nodos}
      {conexiones}
      {elementoSeleccionado}
      {modoActual}
      bind:zoom
      bind:pan
      onSeleccionarElemento={(el) => elementoSeleccionado = el}
      onMoverElemento={handleMoverElemento}
      onActualizarVista={(p, z) => { pan = p; zoom = z; }}
      onCrearConexion={handleCrearConexion}
    />

    <Inspector
      {elementoSeleccionado}
      {herramientaActiva}
      onModificarElemento={handleModificarElemento}
      onDuplicar={handleDuplicar}
      onBorrar={handleBorrarSeleccion}
      onAlinearGrilla={() => {
        if (elementoSeleccionado) {
          elementoSeleccionado.x = Math.round(elementoSeleccionado.x / 20) * 20;
          elementoSeleccionado.y = Math.round(elementoSeleccionado.y / 20) * 20;
          nodos = [...nodos];
        }
      }}
    />
  </div>

  <StatusBar
    nodosCount={nodos.length}
    conexionesCount={conexiones.length}
    seleccionTexto={elementoSeleccionado ? `${elementoSeleccionado.type || elementoSeleccionado.tipo || 'Elemento'} (${elementoSeleccionado.id})` : ""}
    {zoom}
    guardadoOk={true}
    onResetZoom={() => { zoom = 1.0; }}
    onAbrirAyuda={() => alert("Atajos:\nV: Selección\nC: Conectar\nF: Centrar\nCtrl+Z / Ctrl+Y: Deshacer / Rehacer\nCtrl+D: Duplicar\nSupr: Borrar")}
  />
</div>

<style>
  .uni-tools-app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background-color: var(--bg-app);
  }

  .workspace-body {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
  }
</style>
