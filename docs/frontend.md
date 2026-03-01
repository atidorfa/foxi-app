# Frontend

## Páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `app/page.tsx` | Redirect server-side a `/login` o `/therian` |
| `/login` | `app/login/page.tsx` | Login + link a registro |
| `/adopt` | `app/adopt/page.tsx` | Primera adopción de Therian |
| `/therian` | `app/therian/page.tsx` | Perfil principal del Therian activo |
| `/pvp` | `app/pvp/page.tsx` | Arena PvP 3v3 |
| `/casa` | `app/casa/page.tsx` | Almacén de Therians en cápsula |
| `/leaderboard` | `app/leaderboard/page.tsx` | Ranking global |
| `/user/[id]` | `app/user/[id]/page.tsx` | Perfil público de otro usuario |

Todas las páginas de juego son Server Components que cargan datos y pasan DTOs a Client Components.

---

## Componentes principales

### TherianCard (`components/TherianCard.tsx`)

El componente más complejo (~76KB). Muestra toda la información de un Therian en pestañas:

| Tab | Contenido |
|-----|-----------|
| Stats | Barras de vitalidad, agilidad, instinto, carisma + runas equipadas |
| Habilidades | Habilidades PvP equipadas + botón de equipado |
| Cosméticos | Accesorios equipados + acceso a la tienda |

**Props:**
```typescript
interface Props {
  therian: TherianDTO
  isOwner: boolean
}
```

---

### TherianAvatar (`components/TherianAvatar.tsx`)

Router que elige entre dos renderizadores según el nivel del Therian:

- **Nivel 1–2** → `TherianAvatarSVG` (blob simple con paleta + ojos + patrón)
- **Nivel 3+** → `TherianAvatarChibi` (chibi animado egg-head)

**Props:**
```typescript
interface Props {
  therian: TherianDTO
  size?: number        // px, default 120
  animated?: boolean   // default true
}
```

---

### TherianAvatarSVG (`components/TherianAvatarSVG.tsx`)

Avatar SVG por capas generativo:
1. Silueta blob base
2. Relleno de color (palette.primary)
3. Capa de patrón (gradient, stripe, spot, etc.)
4. Signature (cola, cuernos, alas, melena)
5. Ojos (round, sharp, sleepy, etc.)

---

### TherianAvatarChibi (`components/TherianAvatarChibi.tsx`)

Avatar chibi animado para nivel 3+. Más expresivo con animaciones CSS (idle float, blink).

---

### ShopModal (`components/ShopModal.tsx`)

Modal de tienda en overlay. Muestra:
- Tabs: Accesorios / Servicios / Huevos
- Balance del usuario (gold / essence)
- Grid de artículos con botón de compra
- Feedback de transacción

---

### FusionModal (`components/FusionModal.tsx`)

Modal de fusión. Permite:
- Seleccionar dos Therians compatibles
- Opcionalmente usar un huevo del inventario
- Preview del resultado (rareza esperada)
- Confirmar fusión

---

### RuneSystem (`components/RuneSystem.tsx`)

Interfaz para ver y equipar runas. Muestra el inventario de runas del Therian y permite arrastrar/clic para equipar hasta 4.

---

## PvP — Componentes

### PvpPageClient (`components/pvp/PvpPageClient.tsx`)

Lobby PvP completo. Gestiona:
- **Vistas**: `'lobby'` | `'fight'` | `'team'`
- Carga energía, MMR y equipo guardado al montar (`GET /api/pvp/status`, `GET /api/pvp/team`)
- Sidebar con stats del jugador: energía `⚡ N/10`, MMR, rango, victorias semanales
- Si no hay equipo guardado → botón "🛡️ Configura tu equipo" (redirige a vista team)
- Si hay equipo → botón "⚔️ Batalla Clasificatoria" (inicia batalla directamente)
- Pasa `initialTeamIds` a `PvpRoom` para omitir TeamSetup

---

### PvpRoom (`components/pvp/PvpRoom.tsx`)

Orquestador de fases del PvP:

```typescript
type Phase = 'setup' | 'starting' | 'loading_battle' | 'battle' | 'result'
```

| Fase | Qué muestra | Cuándo |
|------|-------------|--------|
| `setup` | `TeamSetup` | Sin equipo / error de inicio |
| `starting` | Spinner "Buscando rival…" | Auto-llama `POST /api/pvp/start` con equipo guardado |
| `loading_battle` | Spinner "Cargando batalla…" | Hay `activeBattleId` al montar |
| `battle` | `BattleField` | Batalla en curso |
| `result` | Pantalla victoria/derrota + recompensas | Batalla terminada |

Props clave:
- `initialTeamIds?: string[]` — si se pasan 3 IDs, salta a `'starting'` y auto-llama la API
- `onBattleComplete?(won, rewards)` — callback para el lobby
- `savedTeamIds?, onTeamSaved?` — persistencia del equipo
- `externalError` — errores propagados a `TeamSetup`

---

### TeamSetup (`components/pvp/TeamSetup.tsx`)

Dos modos de operación:

| Modo | Botón principal | Descripción |
|------|-----------------|-------------|
| `'team-setup'` | 💾 Guardar equipo | Solo guarda el equipo predeterminado |
| `'battle'` | ⚔️ Combatir | Guarda equipo + inicia batalla |

- Grid de cards seleccionables con borde de color por arquetipo
- Contador "X/3 seleccionados"
- Muestra arquetipo, stats y habilidades equipadas
- `externalError?: string` — muestra errores venidos de la fase `'starting'`

---

### BattleField (`components/pvp/BattleField.tsx`)

Arena de combate pre-computada con 4 fases visuales.

```
┌─────────────────────────────────────┐
│  Ronda N  [⚔️ T+1/Total]  [1× 2× 4× ⏭] │
│  ▓▓▓▓▓▓░░░░  barra de progreso     │
├─────────────────────────────────────┤
│  TU EQUIPO      VS      RIVAL       │  ← Phase 1: Arena
│  HP bar                   HP bar   │
│  Avatar →         ← Avatar (flip) │  × 3 por lado
│  Nombre               Nombre      │
│  [●●] dots         dots [●●]      │  ← Phase 4: inspección
├─────────────────────────────────────┤
│  Orden: [🌿][⚡][💧] vs [🔥][💧][🌿]│
├─────────────────────────────────────┤
│  🌿 Zarpazo de Raíz  ATAQUE        │  ← Phase 2: Ability card
│  Daño base ×1.0      Lobo › 35 dmg │
├─────────────────────────────────────┤
│  Registro (últimas 4 entradas)      │
└─────────────────────────────────────┘
```

**Phase 1 — Arena layout:**
- Panel `bg-[#080810]` con gradientes laterales (azul atacante / rojo defensor)
- Therians atacantes a la izquierda, defensores a la derecha con `scaleX(-1)` (cara a cara)
- `ArenaSlot`: barra HP → avatar (con floats) → nombre → dots

**Phase 2 — Active ability card:**
- Se actualiza en cada turno: emoji de arquetipo, nombre, badge ATAQUE/CURA/EFECTO/PASIVO, descripción por `describeAbility()`, actor y resultado

**Phase 3 — Floating damage numbers:**
- Al impacto: números `@keyframes floatUp` sobre el avatar objetivo
- Rojo = daño, Ámbar = bloqueado (`✦N`), Verde = curación, Púrpura = stun
- Auto-limpian tras 1.2 s

**Phase 4 — Ability inspection dots:**
- Dots de arquetipo por habilidad equipada en cada slot
- `title` muestra `Nombre: descripción` al pasar el cursor

**Funciones puras exportadas (testables):**

```typescript
describeAbility(ab: Ability): string
// "Daño base ×0.8. Aturde 1 turno"

hpBarColor(current: number, max: number): 'bg-emerald-500' | 'bg-amber-500' | 'bg-red-500'
// >60% verde, >30% ámbar, ≤30% rojo

resultLines(entry: ActionLogEntry): string[]
// ["35 daño"] / ["+22 HP"] / ["Aturdido: saltea turno"]

applySnapshot(base: BattleState, snap: TurnSnapshot): BattleState
// Retorna nuevo BattleState sin mutar el original
```

---

## Sistema de animaciones WAAPI

Las animaciones de batalla usan el **Web Animations API** (`element.animate()`) directamente sobre el DOM, sin CSS classes ni React keys. Esto garantiza reproducibilidad en React 18 concurrent mode.

### Por qué WAAPI en lugar de CSS classes

CSS class toggling para re-trigger de keyframes es poco confiable en React 18 (concurrent mode puede batching renders, cancelando la transición). `element.animate()` es imperativo y siempre funciona.

### Refs de DOM

`BattleField` mantiene dos `Map<string, HTMLDivElement>`:
- `cardRefs` — card contenedora de cada `ArenaSlot`
- `avatarRefs` — wrapper WAAPI del avatar (**sin** mirror)

El mirror visual (`scaleX(-1)`) se aplica en un div **hijo** del `avatarRef`, de forma que WAAPI puede trasladar el elemento y el flip visual se mantiene compuesto correctamente.

### Secuencia por turno

```
1. Flash blanco en card del actor
2. avatarEl.animate() → vuelo hacia el centroide del/los objetivo(s)
3. Al impacto (offset 0.50): flash rojo/verde en card del objetivo
4. Si daño: shake horizontal en card del objetivo
5. Floats de números suben y desaparecen (1.2 s)
6. HP bars actualizadas con transition-all duration-700
```

### Floating numbers

Estado `floatNums: Map<therianId, FloatNum[]>`. Se generan al procesar cada snapshot y se limpian con `setTimeout` de 1200 ms. El keyframe `floatUp` está en un `<style>` inline del componente (no requiere cambios en `globals.css`).

---

## Animaciones CSS (globals.css)

Para animaciones que no requieren coordinación imperativa:

| Clase | Keyframe | Uso |
|-------|----------|-----|
| `.pvp-attack-right` | `pvp-attack-right` | Lanzamiento izquierda (legacy, no usado) |
| `.pvp-attack-left` | `pvp-attack-left` | Lanzamiento derecha (legacy, no usado) |
| `.pvp-hit-shake` | `pvp-hit-shake` | Sacudida al recibir daño (backup) |
| `.pvp-hit-flash` | `pvp-hit-flash` | Flash rojo de daño (backup) |
| `.pvp-heal-flash` | `pvp-heal-flash` | Flash verde de curación (backup) |
| `.result-reveal` | `result-reveal` | Pantalla de resultado (escala + slide-up) |
| `.icon-pop` | `icon-pop` | Emoji de trofeo/calavera (pop con rotación) |
| `.shimmer` | `shimmer` | Shimmer en elementos cargando |
| `.gradient-text` | — | Texto purple→ember |
| `.gradient-text-legendary` | `shimmer` | Texto dorado animado |
| `.animate-pulse-glow` | `pulse-glow` | Brillo pulsante en borders |
| `.glow-{rarity}` | — | Box-shadow según rareza |
| `.text-glow-{rarity}` | — | Text-shadow según rareza |

---

## Design Tokens (globals.css)

```css
:root {
  --bg-primary:    #08080F;
  --bg-secondary:  #0F0F1A;
  --bg-card:       #13131F;
  --border-dim:    rgba(255,255,255,0.06);
  --border-glow:   rgba(155,89,182,0.3);
  --text-primary:  #F0EEFF;
  --text-secondary: #8B84B0;
  --accent-purple: #9B59B6;
  --accent-ember:  #E67E22;
  --rarity-common:    #9CA3AF;
  --rarity-rare:      #60A5FA;
  --rarity-epic:      #C084FC;
  --rarity-legendary: #FCD34D;
}
```

---

## Navegación

- `NavInventoryButton` — botón de inventario en la navbar
- `CurrencyDisplay` — muestra gold/essence del usuario
- `SignOutButton` — botón de cierre de sesión
- `RarityBadge` — pill de rareza con color apropiado

---

## Patrones de componente

### Server Component (página)
```typescript
// app/therian/page.tsx
export default async function TherianPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const therian = await db.therian.findFirst({ where: { userId: session.user.id } })
  if (!therian) redirect('/adopt')

  return <TherianCard therian={toTherianDTO(therian)} isOwner={true} />
}
```

### Client Component (interactividad)
```typescript
'use client'

export default function TherianCard({ therian, isOwner }: Props) {
  const [tab, setTab] = useState<'stats' | 'abilities' | 'cosmetics'>('stats')
  // ... fetch mutations con fetch() directo
}
```

No se usa TanStack Query en el MVP. Las mutaciones son `fetch()` directos con `router.refresh()` para recargar datos del servidor.

---

## Fonts

El layout raíz carga Geist Sans y Geist Mono via `next/font`. El body usa `Inter` como fallback:

```css
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```
