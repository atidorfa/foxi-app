# CLAUDE.md — Especificación técnica completa (MVP)

## 0) Objetivo del producto
**Foxi (therian.biz)** es una web app donde el usuario:
1. Inicia sesión (email/contraseña local para MVP).
2. Si no tiene Therian, **adopta/genera** uno único proceduralmente.
3. El Therian tiene **apariencia SVG por capas + stats aleatorios** regidos por rareza.
4. Ejecuta **1 acción diaria** (cooldown 24h) que modifica stats + XP.
5. Todo persiste en DB y el sistema está listo para expandirse.

---

## 1) Stack (confirmado para implementación)

### Frontend
- **Next.js 14 (App Router) + TypeScript**
- **Tailwind CSS** (dark theme, custom design tokens)
- **TanStack Query v5** para fetch/caching/mutaciones
- **Framer Motion** para animaciones de carta y acciones

### Backend
- **Next.js API Routes** (monolito, Opción A)
- **NextAuth.js v5** (CredentialsProvider para MVP local)
- Lógica de negocio en `/lib/` (pura, testeable)

### Base de datos
- **SQLite** (desarrollo local, archivo `.db`)
- **Prisma ORM** (migraciones versionadas, tipos generados)
- Migración sencilla a PostgreSQL cambiando `provider` en `schema.prisma`

### Herramientas adicionales
- `seedrandom` — PRNG determinista con seed
- `crypto` (Node built-in) — HMAC-SHA256 para seed
- `uuid` — generación de IDs
- `date-fns` — manejo de fechas/cooldown
- `zod` — validación de inputs en API

---

## 2) Estructura de carpetas

```
foxi/ (therian.biz)
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (game)/
│   │   ├── adopt/
│   │   │   └── page.tsx
│   │   └── therian/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── me/route.ts
│   │   ├── therian/
│   │   │   ├── route.ts          # GET /api/therian
│   │   │   ├── adopt/route.ts    # POST /api/therian/adopt
│   │   │   └── action/route.ts   # POST /api/therian/action
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Redirect a /login o /therian
├── components/
│   ├── TherianCard.tsx
│   ├── TherianAvatar.tsx         # SVG por capas
│   ├── StatBar.tsx
│   ├── DailyActionButtons.tsx
│   ├── FlavorText.tsx
│   ├── RarityBadge.tsx
│   └── SessionProvider.tsx
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── db.ts                     # Prisma singleton
│   ├── generation/
│   │   ├── engine.ts             # Orquestador principal
│   │   ├── prng.ts               # Wrapper seedrandom
│   │   └── catalogs/
│   │       ├── species.ts
│   │       ├── traits.ts
│   │       └── appearance.ts
│   └── actions/
│       ├── engine.ts             # Lógica de acciones diarias
│       └── narratives.ts         # Textos narrativos por acción
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.local
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 3) Modelos de datos (Prisma)

```prisma
model User {
  id         String    @id @default(uuid())
  email      String    @unique
  password   String    // bcrypt hash
  name       String?
  createdAt  DateTime  @default(now())
  therian    Therian?
}

model Therian {
  id           String    @id @default(uuid())
  userId       String    @unique
  user         User      @relation(fields: [userId], references: [id])
  speciesId    String
  rarity       String    // COMMON | RARE | EPIC | LEGENDARY
  seed         String
  appearance   String    // JSON serializado
  stats        String    // JSON serializado
  traitId      String
  level        Int       @default(1)
  xp           Int       @default(0)
  lastActionAt DateTime?
  createdAt    DateTime  @default(now())
  actionLogs   ActionLog[]
}

model ActionLog {
  id         String   @id @default(uuid())
  therianId  String
  therian    Therian  @relation(fields: [therianId], references: [id])
  actionType String
  delta      String   // JSON serializado
  narrative  String
  createdAt  DateTime @default(now())
}
```

---

## 4) Catálogos de contenido (data-driven)

### species.ts — 6 especies MVP
```typescript
export const SPECIES = [
  { id: 'wolf',  name: 'Lobo',   bias: { vitality: +8, agility: +5, instinct: +3, charisma: -2 } },
  { id: 'fox',   name: 'Zorro',  bias: { vitality: -2, agility: +8, instinct: +5, charisma: +3 } },
  { id: 'cat',   name: 'Gato',   bias: { vitality: +2, agility: +5, instinct: +8, charisma: -1 } },
  { id: 'crow',  name: 'Cuervo', bias: { vitality: -3, agility: +3, instinct: +7, charisma: +8 } },
  { id: 'deer',  name: 'Ciervo', bias: { vitality: +5, agility: +3, instinct: +4, charisma: +5 } },
  { id: 'bear',  name: 'Oso',    bias: { vitality: +10,agility: -3, instinct: +2, charisma: +1 } },
]
```

### traits.ts — 8 arquetipos
```typescript
export const TRAITS = [
  { id: 'silent',     name: 'Silencioso',  mod: { instinct: +5, charisma: -3 }, lore: 'Escucha lo que nadie más oye.' },
  { id: 'impulsive',  name: 'Impulsivo',   mod: { agility: +6, vitality: -2 },  lore: 'Actúa antes de pensar.' },
  { id: 'guardian',   name: 'Protector',   mod: { vitality: +6, agility: -2 },  lore: 'Nadie cae mientras él esté.' },
  { id: 'curious',    name: 'Curioso',     mod: { instinct: +4, agility: +3 },  lore: 'El mundo es demasiado pequeño.' },
  { id: 'charismatic',name: 'Carismático', mod: { charisma: +8, vitality: -2 }, lore: 'Todos le prestan atención.' },
  { id: 'feral',      name: 'Salvaje',     mod: { vitality: +5, charisma: -5 }, lore: 'No necesita reglas.' },
  { id: 'mystic',     name: 'Místico',     mod: { instinct: +7, agility: -2 },  lore: 'Ve lo que el tiempo esconde.' },
  { id: 'loyal',      name: 'Leal',        mod: { vitality: +3, charisma: +4 }, lore: 'No abandona. Nunca.' },
]
```

### appearance.ts — Paletas, ojos, patrones, signatures
```typescript
export const PALETTES = [
  { id: 'ember',    primary: '#C0392B', secondary: '#E67E22', accent: '#F39C12' },
  { id: 'shadow',   primary: '#2C3E50', secondary: '#34495E', accent: '#95A5A6' },
  { id: 'forest',   primary: '#27AE60', secondary: '#1E8449', accent: '#A9DFBF' },
  { id: 'frost',    primary: '#2980B9', secondary: '#85C1E9', accent: '#EBF5FB' },
  { id: 'dusk',     primary: '#8E44AD', secondary: '#D7BDE2', accent: '#F8F9FA' },
  { id: 'gold',     primary: '#D4AC0D', secondary: '#F9E79F', accent: '#7D6608' },
  { id: 'void',     primary: '#1A1A2E', secondary: '#16213E', accent: '#E94560' },
  { id: 'dawn',     primary: '#F06292', secondary: '#FFB74D', accent: '#FFF9C4' },
]
export const EYES = ['round','sharp','sleepy','fierce','gentle','hollow','glowing','star']
export const PATTERNS = ['solid','stripe','spot','gradient','void','ember','frost','dual']
export const SIGNATURES = ['tail_long','tail_fluffy','horns_small','horns_grand','wings_small','mane','no_signature','crown']
```

---

## 5) Motor de generación procedural

### Seed
```typescript
// lib/generation/prng.ts
import { createHmac } from 'crypto'
import seedrandom from 'seedrandom'

export function createSeed(userId: string, timestamp: number, secret: string): string {
  return createHmac('sha256', secret).update(`${userId}:${timestamp}`).digest('hex')
}

export function createRNG(seed: string) {
  const rng = seedrandom(seed)
  return {
    next: () => rng(),                              // [0,1)
    choice: <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)],
    weighted: <T>(items: Array<{ value: T; weight: number }>): T => {
      const total = items.reduce((s, i) => s + i.weight, 0)
      let r = rng() * total
      for (const item of items) { r -= item.weight; if (r <= 0) return item.value }
      return items[items.length - 1].value
    }
  }
}
```

### Engine
```typescript
// lib/generation/engine.ts
export function generateTherian(userId: string, secret: string): GeneratedTherian {
  const timestamp = Date.now()
  const seed = createSeed(userId, timestamp, secret)
  const rng = createRNG(seed)

  // 1. Rareza
  const rarity = rng.weighted([
    { value: 'COMMON',    weight: 70 },
    { value: 'RARE',      weight: 20 },
    { value: 'EPIC',      weight:  9 },
    { value: 'LEGENDARY', weight:  1 },
  ])

  // 2. Especie
  const species = rng.choice(SPECIES)

  // 3. Trait
  const trait = rng.choice(TRAITS)

  // 4. Stats (base + bias + trait + rarity bonus)
  const rarityBonus = { COMMON: 0, RARE: 5, EPIC: 10, LEGENDARY: 20 }[rarity]
  const stats = generateStats(rng, species.bias, trait.mod, rarityBonus)

  // 5. Apariencia
  const appearance = generateAppearance(rng, rarity)

  return { seed, rarity, species, trait, stats, appearance, timestamp }
}
```

---

## 6) API Routes — Contratos completos

### GET /api/me
```json
{ "id": "uuid", "email": "user@example.com", "name": "Usuario" }
```

### GET /api/therian
- 200: Therian DTO
- 404: `{ "error": "NO_THERIAN" }`

### POST /api/therian/adopt
- Body: `{}`
- 201: Therian DTO
- 409: `{ "error": "ALREADY_HAS_THERIAN" }`

### POST /api/therian/action
- Body: `{ "action_type": "CARE" | "TRAIN" | "EXPLORE" | "SOCIAL" }`
- 200: `{ "therian": TherianDTO, "narrative": "string", "delta": {...} }`
- 429: `{ "error": "COOLDOWN_ACTIVE", "nextActionAt": "ISO string" }`

### Therian DTO completo
```typescript
interface TherianDTO {
  id: string
  species: { id: string; name: string }
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  trait: { id: string; name: string; lore: string }
  appearance: {
    palette: string; paletteColors: { primary: string; secondary: string; accent: string }
    eyes: string; pattern: string; signature: string
  }
  stats: { vitality: number; agility: number; instinct: number; charisma: number }
  level: number
  xp: number
  xpToNext: number         // XP requerido al siguiente nivel
  lastActionAt: string | null
  canAct: boolean          // cooldown check
  nextActionAt: string | null
  createdAt: string
}
```

---

## 7) Lógica de acciones diarias

```typescript
const ACTION_DELTAS = {
  CARE:    { stat: 'vitality',  amount: 3, xp: 10 },
  TRAIN:   { stat: 'agility',   amount: 3, xp: 10 },
  EXPLORE: { stat: 'instinct',  amount: 3, xp: 10 },
  SOCIAL:  { stat: 'charisma',  amount: 3, xp: 10 },
}

// Cooldown: 24h desde last_action_at
function canAct(lastActionAt: Date | null): boolean {
  if (!lastActionAt) return true
  return Date.now() - lastActionAt.getTime() > 24 * 60 * 60 * 1000
}
```

---

## 8) Variables de entorno (.env.local)

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="local-dev-secret-change-in-prod"
NEXTAUTH_URL="http://localhost:3000"
SERVER_SECRET="therian-hmac-secret-local"
APP_BASE_URL="http://localhost:3000"
```

---

## 9) Diseño visual (Tailwind tokens)

```typescript
// tailwind.config.ts — colores custom
colors: {
  night:    { DEFAULT: '#0A0A0F', 100: '#0F0F1A', 200: '#1A1A2E' },
  aurora:   { 50: '#F8F0FF', 100: '#EDD9FF', 500: '#9B59B6', 600: '#8E44AD' },
  ember:    { 400: '#E67E22', 500: '#D35400' },
  rarity: {
    common:    '#9CA3AF',
    rare:      '#60A5FA',
    epic:      '#C084FC',
    legendary: '#FCD34D',
  }
}
```

---

## 10) Checklist MVP
- [ ] Login con email/contraseña
- [ ] Adopt genera y persiste Therian único por usuario
- [ ] Avatar SVG por capas (paleta + ojos + patrón + signature)
- [ ] Carta de perfil con stats + rareza + trait + lore
- [ ] Acción diaria con cooldown + texto narrativo
- [ ] Animaciones suaves (Framer Motion)
- [ ] Responsive + dark theme profesional
- [ ] Tests del motor de generación (determinismo)
