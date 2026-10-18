# Especificación de Esquemas de Documentos y Persistencia

**Estado:** Aprobado  
**Fecha:** 2026-10-18  
**Módulo:** `core/schemas`  
**Implementación:** `src/core/schemas/document.schema.ts`

---

## 1. Propósito
Definir los esquemas formales y tipos de TypeScript para la validación en tiempo de ejecución (mediante **Zod**) y serialización de los documentos de las 3 herramientas de `uni-tools`.
Garantiza la compatibilidad bidireccional con los archivos `.json` existentes y los archivos `.svg` con metadatos incrustados (`<metadata id="uni-tools-datos">`).

---

## 2. Esquema Común

### 2.1 Hoja de Impresión (`HojaSchema`)
Define el área de impresión estándar (A4, carta, etc.) u orientación:
```ts
export const HojaSchema = z.object({
  preset: z.string().default("A4-H"),
  w: z.number().positive(),
  h: z.number().positive(),
  orientacion: z.enum(["horizontal", "vertical"]).default("horizontal")
}).nullable().default(null);
```

### 2.2 Tema de Colores (`TemaSchema`)
```ts
export const TemaSchema = z.object({
  relleno: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default("#ffffff"),
  borde: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default("#101418"),
  texto: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default("#101418"),
  flecha: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  cable: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  fondo: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default("#ffffff")
}).default({});
```

---

## 3. Esquema de Diagramas de Bloques

### 3.1 Nodo de Bloque (`BloqueNodoSchema`)
Tipos: `block`, `sum`, `node`, `io`, `text`, `marco`.
```ts
export const SignosSumadorSchema = z.object({
  l: z.string().default("+"),
  t: z.string().default(""),
  r: z.string().default(""),
  b: z.string().default("−")
});

export const BloqueNodoSchema = z.object({
  id: z.string(),
  type: z.enum(["block", "sum", "node", "io", "text", "marco"]),
  x: z.number(),
  y: z.number(),
  w: z.number().default(72),
  h: z.number().default(42),
  label: z.string().default(""),
  font: z.number().default(14),
  signs: SignosSumadorSchema.optional(),
  cross: z.boolean().optional(),
  color: z.string().optional(),
  // Opciones para marcos de agrupación
  atras: z.boolean().optional(),
  radio: z.number().optional(),
  grosor: z.number().optional()
});
```

### 3.2 Flecha de Conexión (`BloqueFlechaSchema`)
```ts
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

export const DocumentoBloquesSchema = z.object({
  nombre: z.string().default("diagrama-de-bloques"),
  nodes: z.array(BloqueNodoSchema).default([]),
  edges: z.array(BloqueFlechaSchema).default([]),
  tema: TemaSchema.optional(),
  hoja: HojaSchema.optional()
});
```

---

## 4. Esquema del Simulador Lógico

### 4.1 Componente Lógico (`SimuladorNodoSchema`)
```ts
export const TipoCompuertaSchema = z.enum([
  "and", "or", "not", "nand", "nor", "xor", "xnor", "buf",
  "in", "clk", "out", "ff", "half-adder", "full-adder", "label", "marco"
]);

export const BiestableKindSchema = z.enum(["sr", "d", "jk", "t"]);

export const SimuladorNodoSchema = z.object({
  id: z.string(),
  type: TipoCompuertaSchema,
  x: z.number(),
  y: z.number(),
  label: z.string().default(""),
  pins: z.number().int().min(1).optional(),
  on: z.boolean().optional(),
  modo: z.enum(["pulso", "toggle"]).optional(),
  corriendo: z.boolean().optional(),
  // Biestables
  kind: BiestableKindSchema.optional(),
  conClk: z.boolean().optional(),
  q: z.number().int().min(0).max(1).optional(),
  salida: z.string().optional(),
  salidaNeg: z.string().optional(),
  // Marco / visual
  w: z.number().optional(),
  h: z.number().optional(),
  font: z.number().optional(),
  color: z.string().optional()
});

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

export const DocumentoSimuladorSchema = z.object({
  nombre: z.string().default("circuito-logico"),
  nodes: z.array(SimuladorNodoSchema).default([]),
  wires: z.array(SimuladorCableSchema).default([]),
  tema: TemaSchema.optional(),
  hoja: HojaSchema.optional()
});
```

---

## 5. Esquema del Diagrama de Señales (SFG)

### 5.1 Nodos y Ramas
```ts
export const SenalNodoSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1),
  x: z.number(),
  y: z.number(),
  tipo: z.enum(["normal", "entrada", "salida"]).default("normal"),
  color: z.string().optional()
});

export const SenalRamaSchema = z.object({
  id: z.string(),
  de: z.string(),
  a: z.string(),
  g: z.string().default("1"), // Ganancia/transmitancia (ej. "G1", "-H2", "5.4")
  curva: z.number().default(0),
  curvaFija: z.boolean().optional(),
  color: z.string().optional()
});

export const DocumentoSenalesSchema = z.object({
  nombre: z.string().default("diagrama-de-senales"),
  nodos: z.array(SenalNodoSchema).default([]),
  ramas: z.array(SenalRamaSchema).default([]),
  tema: TemaSchema.optional()
});
```

---

## 6. Criterios de Aceptación
1. `DocumentoBloquesSchema.safeParse(jsonLegacy)` debe parsear correctamente cualquier archivo generado por la versión legacy sin arrojar errores.
2. Los campos faltantes deben autocompletarse con valores por defecto seguros.
3. Se deben sanitizar los IDs para asegurar unicidad y descartar conexiones hacia nodos inexistentes.
