#!/usr/bin/env node
/**
 * Visualizador CLI del tablero de control de uni-tools (ESM).
 * Uso: node docs/tablero.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TABLERO_PATH = path.join(__dirname, "tablero.json");

if (!fs.existsSync(TABLERO_PATH)) {
  console.error("Error: No se encontró el archivo tablero.json");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(TABLERO_PATH, "utf8"));

// Estilos ANSI para la terminal
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m"
};

const ICONOS = {
  completado: `${C.green}✓ [COMPLETADO]${C.reset}`,
  en_progreso: `${C.yellow}► [EN CURSO]  ${C.reset}`,
  pendiente: `${C.gray}○ [PENDIENTE] ${C.reset}`,
  bloqueado: `${C.red}✖ [BLOQUEADO] ${C.reset}`
};

console.log("\n" + "=".repeat(75));
console.log(`${C.bold}${C.cyan} TABLERO DE CONTROL - UNI-TOOLS (SDD) ${C.reset}`);
console.log(`Versión: ${data.version} | Última actualización: ${data.ultima_actualizacion}`);
console.log(`Fuente de verdad: ${C.bold}${data.fuente_de_verdad}${C.reset}`);
console.log("=".repeat(75));

const r = data.resumen;
console.log(`\n${C.bold}Resumen de Avance:${C.reset}`);
console.log(`  Total: ${r.total_tareas} | ` +
            `${C.green}Completadas: ${r.completadas}${C.reset} | ` +
            `${C.yellow}En curso: ${r.en_progreso}${C.reset} | ` +
            `${C.gray}Pendientes: ${r.pendientes}${C.reset} | ` +
            `${C.red}Bloqueadas: ${r.bloqueadas}${C.reset}\n`);

data.fases.forEach((fase) => {
  const faseColor = fase.estado === "completado" ? C.green : (fase.estado === "en_progreso" ? C.yellow : C.gray);
  console.log(`${faseColor}${C.bold}▶ ${fase.nombre}${C.reset}`);
  
  fase.tareas.forEach((t) => {
    const icon = ICONOS[t.estado] || t.estado;
    const prio = t.prioridad === "alta" ? `${C.red}!${C.reset}` : " ";
    console.log(`  ${icon} ${prio} ${C.bold}${t.id}${C.reset}: ${t.titulo}`);
    if (t.archivo_asociado) {
      console.log(`        ${C.dim}↳ Archivo: ${t.archivo_asociado}${C.reset}`);
    }
  });
  console.log();
});

console.log("=".repeat(75) + "\n");
