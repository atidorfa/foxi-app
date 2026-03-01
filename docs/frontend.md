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

### PvpRoom (`components/pvp/PvpRoom.tsx`)

Orquestador de estados del PvP:

```typescript
type Phase = 'setup' | 'loading_battle' | 'battle' | 'result'
```

- `setup` → `TeamSetup`
- `loading_battle` → spinner mientras carga batalla activa
- `battle` → `BattleField`
- `result` → pantalla de victoria/derrota

Al montar, verifica si hay una batalla activa (`activeBattleId` prop) y la carga vía `GET /api/pvp/[id]`.

---

### TeamSetup (`components/pvp/TeamSetup.tsx`)

Selección del equipo de 3 Therians:
- Grid de cards seleccionables (borde colored al seleccionar)
- Contador "X/3 seleccionados"
- Muestra arquetipo, stats y habilidades equipadas
- Botón "⚔️ Combatir" (disabled < 3) → `POST /api/pvp/start`

---

### BattleField (`components/pvp/BattleField.tsx`)

Arena de combate. Estructura:

```
┌─────────────────────────────────────┐
│  COLA DE TURNOS (6 chips)           │
├────────────────┬────────────────────┤
│  TU EQUIPO     │   RIVAL            │
│  Avatar + HP   │  Avatar + HP       │  × 3
├─────────────────────────────────────┤
│  HABILIDADES (turno propio)         │
├─────────────────────────────────────┤
│  LOG (últimas 4 entradas)           │
└─────────────────────────────────────┘
```

**Flujo de un turno animado:**

1. Recibir `snapshots[]` del servidor
2. Para cada snapshot (200ms delay entre ellos):
   a. Ejecutar animación WAAPI de ataque
   b. Aplicar flash/shake al objetivo
   c. Actualizar HP bars y estado visual
3. Al terminar todos los snapshots → mostrar habilidades del jugador

---

## Sistema de animaciones WAAPI

Las animaciones de batalla usan el **Web Animations API** (`element.animate()`) directamente sobre el DOM, sin CSS classes ni React keys. Esto garantiza reproducibilidad en React 18 concurrent mode.

### Por qué WAAPI en lugar de CSS classes

CSS class toggling para re-trigger de keyframes es poco confiable en React 18 (concurrent mode puede batching renders, cancelando la transición). `element.animate()` es imperativo y siempre funciona.

### Implementación

```typescript
// En BattleField — useEffect reacciona a animInfo
useEffect(() => {
  if (!animInfo) return
  const { actorId, targetIds, actorSide, isHeal } = animInfo

  // 1. Elevar z-index del atacante para que vuele por encima
  const actorCard = cardRefs.current.get(actorId)
  if (actorCard) {
    actorCard.style.zIndex = '50'
    setTimeout(() => { actorCard.style.zIndex = '' }, 750)
  }

  // 2. Flash blanco en el atacante
  actorCard?.animate([
    { boxShadow: '0 0 0 2px rgba(255,255,255,0.7), 0 0 20px rgba(255,255,255,0.3)' },
    { boxShadow: 'none' },
  ], { duration: 450 })

  // 3. Vuelo cross-battlefield usando getBoundingClientRect()
  const avatarEl = avatarRefs.current.get(actorId)
  // calcular dx, dy desde centroide del actor hasta centroide(s) del/los objetivo(s)
  // ... (ver código fuente en BattleField.tsx)

  // 4. Flash/shake en objetivos (sincronizado con el impacto a offset 0.50)
  const impactDelay = Math.round(animDuration * 0.46)
  for (const targetId of targetIds) {
    cardRefs.current.get(targetId)?.animate([/* red/green flash */], { delay: impactDelay })
  }
}, [animInfo])
```

### Refs de elementos DOM

`BattleField` mantiene dos `Map<string, HTMLDivElement>`:
- `cardRefs` — card contenedora de cada slot
- `avatarRefs` — elemento del avatar (con `willChange: 'transform'`)

Los `SlotCard` children los registran via props `onCardRef` / `onAvatarRef`.

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
