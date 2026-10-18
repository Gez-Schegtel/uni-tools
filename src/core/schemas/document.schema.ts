import { z } from "zod";

/* ===================================================================
   Esquemas de Documentos y Modelos de uni-tools
   Conforme a la especificación en docs/specs/core/document-schema.spec.md
   =================================================================== */

// 1. Esquema Común: Hoja de Impresión
export const HojaSchema = z.object({
  preset: z.string().default("A4-H"),
  w: z.number().positive(),
  h: z.number().positive(),
  orientacion: z.enum(["horizontal", "vertical"]).default("horizontal")
}).nullable().default(null);

export type Hoja = z.infer<typeof HojaSchema>;

// 2. Esquema Común: Tema de Colores
export const TemaSchema = z.object({
  relleno: z.string().default("#ffffff"),
  borde: z.string().default("#101418"),
  texto: z.string().default("#101418"),
  flecha: z.string().optional(),
  cable: z.string().optional(),
  fondo: z.string().default("#ffffff")
}).default({
  relleno: "#ffffff",
  borde: "#101418",
  texto: "#101418",
  fondo: "#ffffff"
});

export type Tema = z.infer<typeof TemaSchema>;

// 3. Diagrama de Bloques
export const SignosSumadorSchema = z.object({
  l: z.string().default("+"),
  t: z.string().default(""),
  r: z.string().default(""),
  b: z.string().default("−")
}).default({ l: "+", t: "", r: "", b: "−" });

export const BloqueNodoSchema = z.object({
  id: z.string(),
  type: z.enum(["block", "sum", "node", "io", "text", "marco"]),
  x: z.number().default(0),
  y: z.number().default(0),
  w: z.number().default(72),
  h: z.number().default(42),
  label: z.string().default(""),
  font: z.number().default(14),
  signs: SignosSumadorSchema.optional(),
  cross: z.boolean().optional(),
  color: z.string().optional(),
  atras: z.boolean().optional(),
  radio: z.number().optional(),
  grosor: z.number().optional()
});

export type BloqueNodo = z.infer<typeof BloqueNodoSchema>;

export const PuertoRefSchema = z.object({
  id: z.string(),
  port: z.enum(["l", "r", "t", "b"]).default("r")
});

export const BloqueFlechaSchema = z.object({
  id: z.string(),
  from: PuertoRefSchema,
  to: PuertoRefSchema,
  label: z.string().default(""),
  variant: z.number().int().default(0),
  width: z.number().optional(),
  color: z.string().optional(),
  dashed: z.boolean().optional(),
  arrow: z.boolean().optional(),
  manual: z.object({
    c: z.array(z.number())
  }).optional()
});

export type BloqueFlecha = z.infer<typeof BloqueFlechaSchema>;

export const DocumentoBloquesSchema = z.object({
  nombre: z.string().default("diagrama-de-bloques"),
  nodes: z.array(BloqueNodoSchema).default([]),
  edges: z.array(BloqueFlechaSchema).default([]),
  tema: TemaSchema.optional(),
  hoja: HojaSchema.optional()
});

export type DocumentoBloques = z.infer<typeof DocumentoBloquesSchema>;

// 4. Simulador Lógico
export const TipoCompuertaSchema = z.enum([
  "and", "or", "not", "nand", "nor", "xor", "xnor", "buf",
  "in", "clk", "out", "ff", "half-adder", "full-adder", "label", "marco"
]);

export const BiestableKindSchema = z.enum(["sr", "d", "jk", "t"]);

export const SimuladorNodoSchema = z.object({
  id: z.string(),
  type: TipoCompuertaSchema,
  x: z.number().default(0),
  y: z.number().default(0),
  label: z.string().default(""),
  pins: z.number().int().min(1).optional(),
  on: z.boolean().optional(),
  modo: z.enum(["pulso", "toggle"]).optional(),
  corriendo: z.boolean().optional(),
  kind: BiestableKindSchema.optional(),
  conClk: z.boolean().optional(),
  q: z.number().int().min(0).max(1).optional(),
  salida: z.string().optional(),
  salidaNeg: z.string().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  font: z.number().optional(),
  color: z.string().optional()
});

export type SimuladorNodo = z.infer<typeof SimuladorNodoSchema>;

export const SimuladorCableSchema = z.object({
  id: z.string(),
  from: z.object({
    id: z.string(),
    pin: z.union([z.string(), z.number()]).default("o")
  }),
  to: z.object({
    id: z.string(),
    pin: z.number().int()
  }),
  variant: z.number().int().default(0),
  color: z.string().optional()
});

export type SimuladorCable = z.infer<typeof SimuladorCableSchema>;

export const DocumentoSimuladorSchema = z.object({
  nombre: z.string().default("circuito-logico"),
  nodes: z.array(SimuladorNodoSchema).default([]),
  wires: z.array(SimuladorCableSchema).default([]),
  tema: TemaSchema.optional(),
  hoja: HojaSchema.optional()
});

export type DocumentoSimulador = z.infer<typeof DocumentoSimuladorSchema>;

// 5. Diagrama de Señales (SFG)
export const SenalNodoSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1),
  x: z.number().default(0),
  y: z.number().default(0),
  tipo: z.enum(["normal", "entrada", "salida"]).default("normal"),
  color: z.string().optional()
});

export type SenalNodo = z.infer<typeof SenalNodoSchema>;

export const SenalRamaSchema = z.object({
  id: z.string(),
  de: z.string(),
  a: z.string(),
  g: z.string().default("1"),
  curva: z.number().default(0),
  curvaFija: z.boolean().optional(),
  color: z.string().optional()
});

export type SenalRama = z.infer<typeof SenalRamaSchema>;

export const DocumentoSenalesSchema = z.object({
  nombre: z.string().default("diagrama-de-senales"),
  nodos: z.array(SenalNodoSchema).default([]),
  ramas: z.array(SenalRamaSchema).default([]),
  tema: TemaSchema.optional()
});

export type DocumentoSenales = z.infer<typeof DocumentoSenalesSchema>;
