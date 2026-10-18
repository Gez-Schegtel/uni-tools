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
        { id: "in1", type: "in", x: 120, y: 160, label: "A", on: true },
        { id: "in2", type: "in", x: 120, y: 260, label: "B", on: false },
        { id: "and1", type: "and", x: 260, y: 200, label: "AND", pins: 2 },
        { id: "not1", type: "not", x: 260, y: 320, label: "NOT", pins: 1 },
        { id: "out1", type: "out", x: 400, y: 200, label: "S1" },
        { id: "out2", type: "out", x: 400, y: 320, label: "S2" }
      ];
      conexiones = [
        { id: "w1", from: { id: "in1", pin: "o" }, to: { id: "and1", pin: 0 } },
        { id: "w2", from: { id: "in2", pin: "o" }, to: { id: "and1", pin: 1 } },
        { id: "w3", from: { id: "and1", pin: "o" }, to: { id: "out1", pin: 0 } },
        { id: "w4", from: { id: "in2", pin: "o" }, to: { id: "not1", pin: 0 }, branchFrom: "w2", branchPt: { x: 180, y: 260 } },
        { id: "w5", from: { id: "not1", pin: "o" }, to: { id: "out2", pin: 0 } }
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
      if (tipo.startsWith("ff-")) {
        const kind = tipo.replace("ff-", "");
        nuevo.type = "ff";
        nuevo.kind = kind;
        nuevo.label = "FF-" + kind.toUpperCase();
        nuevo.q = 0;
      } else if (tipo === "clk") {
        nuevo.type = "clk";
        nuevo.label = "CLK";
        nuevo.on = false;
      } else if (tipo === "in") {
        nuevo.type = "in";
        nuevo.label = "IN";
        nuevo.on = false;
      } else if (tipo === "out") {
        nuevo.type = "out";
        nuevo.label = "OUT";
      } else if (tipo === "node") {
        nuevo.type = "node";
      } else {
        nuevo.type = tipo;
        nuevo.label = tipo.toUpperCase();
        nuevo.pins = (tipo === "not" || tipo === "buf") ? 1 : 2;
      }
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
    conexiones = conexiones.filter(c => c.id !== id && c.from?.id !== id && c.to?.id !== id && c.de !== id && c.a !== id);
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

  function handleCrearConexion(
    desdeId: string,
    hastaId: string,
    desdePin?: string | number,
    hastaPin?: string | number,
    extra?: { branchFrom?: string; branchPt?: { x: number; y: number } }
  ) {
    const nuevaConexion: any = {
      id: "conn_" + ++uidCounter,
      from: { id: desdeId, pin: desdePin ?? "o" },
      to: { id: hastaId, pin: hastaPin ?? 0 },
      de: desdeId,
      a: hastaId,
      g: "1",
      label: ""
    };
    if (extra?.branchFrom) nuevaConexion.branchFrom = extra.branchFrom;
    if (extra?.branchPt) nuevaConexion.branchPt = extra.branchPt;
    conexiones = [...conexiones, nuevaConexion];
    commitState();
  }

  function handleModificarConexion(id: string, prop: string, valor: any) {
    const c = conexiones.find(item => item.id === id);
    if (c) {
      c[prop] = valor;
      conexiones = [...conexiones];
      commitState();
    }
  }

  function handleToggleNodo(id: string) {
    const n = nodos.find(item => item.id === id);
    if (n) {
      n.on = !n.on;
      nodos = [...nodos];
      commitState();
    }
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

    if (e.key === " " || e.code === "Space") {
      if (elementoSeleccionado?.type === "in" || elementoSeleccionado?.type === "clk") {
        e.preventDefault();
        handleToggleNodo(elementoSeleccionado.id);
        return;
      }
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
      {herramientaActiva}
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
      onToggleNodo={handleToggleNodo}
      onModificarConexion={handleModificarConexion}
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
