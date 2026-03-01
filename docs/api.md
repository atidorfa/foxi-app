# API Reference

Todas las rutas viven bajo `/api/`. Siguen el patrón estándar descrito en `docs/architecture.md`.

**Autenticación:** JWT via NextAuth. Todas las rutas protegidas devuelven `401 UNAUTHORIZED` si no hay sesión.

**Formato de error:**
```json
{ "error": "CODIGO_ERROR" }
```

---

## Auth

### `POST /api/auth/register`

Crea un nuevo usuario y envía email de verificación.

**Body:**
```json
{ "email": "user@example.com", "password": "min8chars", "name": "Nombre" }
```

**Respuestas:**
| Status | Body |
|--------|------|
| 201 | `{ "message": "VERIFICATION_EMAIL_SENT" }` |
| 400 | `{ "error": "INVALID_INPUT" }` |
| 409 | `{ "error": "EMAIL_ALREADY_EXISTS" }` |

---

### `GET /api/auth/verify?token=<token>`

Verifica el email del usuario mediante el token enviado por correo.

**Respuestas:**
| Status | Behavior |
|--------|----------|
| 302 | Redirect a `/login` con query `?verified=true` |
| 400 | Token inválido o expirado |

---

### `POST /api/auth/[...nextauth]`

NextAuth.js handler — gestiona login (`/api/auth/signin`), logout (`/api/auth/signout`) y sesión JWT.

---

## Sesión

### `GET /api/me`

Devuelve datos básicos del usuario autenticado.

**Respuesta 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Nombre"
}
```

---

## Therian (activo)

### `GET /api/therian`

Devuelve el Therian activo del usuario (el primero por `createdAt asc`).

**Respuesta 200:** `TherianDTO` (ver abajo)

**Respuesta 404:** `{ "error": "NO_THERIAN" }`

---

### `POST /api/therian/adopt`

Genera proceduralmente y persiste un nuevo Therian.

**Body:** `{}` (vacío)

**Respuestas:**
| Status | Body |
|--------|------|
| 201 | `TherianDTO` |
| 409 | `{ "error": "SLOTS_FULL" }` — ya alcanzó el límite de slots |

---

### `POST /api/therian/action`

Ejecuta una acción diaria del Therian activo.

**Body:**
```json
{ "action_type": "CARE" | "TRAIN" | "EXPLORE" | "SOCIAL" }
```

**Respuesta 200:**
```json
{
  "therian": TherianDTO,
  "narrative": "Texto narrativo de la acción",
  "delta": { "stat": "vitality", "amount": 3, "xp": 10 }
}
```

**Errores:**
| Código | Status | Descripción |
|--------|--------|-------------|
| `ACTIONS_MAXED` | 429 | Ya usó todas las acciones del período |
| `INVALID_INPUT` | 400 | `action_type` no válido |

---

### `POST /api/therian/action-reset`

Reinicia el contador de acciones del Therian (admin / debug).

**Body:** `{ "therianId": "uuid" }`

---

### `POST /api/therian/bite`

El Therian muerde a otro (cooldown 24h).

**Body:** `{ "targetId": "uuid" }` — ID del Therian objetivo

**Respuesta 200:** `{ "bites": <nuevo_total> }`

**Errores:**
| Código | Status |
|--------|--------|
| `COOLDOWN_ACTIVE` | 429 |
| `SELF_BITE` | 400 |
| `NOT_FOUND` | 404 |

---

### `POST /api/therian/name`

Asigna un nombre único al Therian.

**Body:** `{ "therianId": "uuid", "name": "NombreUnico" }`

**Respuesta 200:** `{ "name": "NombreUnico" }`

**Errores:**
| Código | Status |
|--------|--------|
| `NAME_TAKEN` | 409 |
| `INVALID_INPUT` | 400 |

---

### `POST /api/therian/runes`

Equipa o desequipa runas en el Therian.

**Body:** `{ "therianId": "uuid", "runeIds": ["v_1", "a_2"] }`

**Respuesta 200:** `TherianDTO` actualizado

---

### `POST /api/therian/equip`

Endpoint de equipado genérico (runas / apariencia).

---

### `POST /api/therian/accessory-equip`

Equipa un accesorio en el Therian desde el inventario del usuario.

**Body:** `{ "therianId": "uuid", "accessoryId": "glasses", "slot": "anteojos" }`

**Respuesta 200:** `TherianDTO` actualizado

---

### `POST /api/therian/equip-abilities`

Equipa habilidades PvP en el Therian (máx. 4).

**Body:** `{ "therianId": "uuid", "abilityIds": ["for_regen", "for_enred"] }`

**Respuesta 200:** `{ "equippedAbilities": ["for_regen", "for_enred"] }`

**Errores:**
| Código | Status |
|--------|--------|
| `TOO_MANY` | 400 — más de 4 IDs |
| `NOT_FOUND` | 404 — Therian no pertenece al usuario |

---

### `POST /api/therian/fuse`

Fusiona dos Therians para generar uno de rareza superior.

**Body:** `{ "therianAId": "uuid", "therianBId": "uuid", "eggId"?: "egg_rare" }`

El slot donde faltaría rareza puede cubrirse con un huevo del inventario.

**Respuesta 200:** `TherianDTO` del nuevo Therian fusionado

**Errores:**
| Código | Status |
|--------|--------|
| `NOT_FOUND` | 404 — uno de los Therians no existe |
| `SAME_THERIAN` | 400 |
| `RARITY_MISMATCH` | 400 — no compatibles para fusión |
| `NO_EGG` | 400 — falta huevo del inventario |

---

### `POST /api/therian/capsule`

Guarda un Therian en cápsula (status → `capsule`).

**Body:** `{ "therianId": "uuid" }`

**Respuesta 200:** `{ "status": "capsule" }`

---

### `POST /api/therian/release`

Libera (elimina permanentemente) un Therian.

**Body:** `{ "therianId": "uuid" }`

**Respuesta 200:** `{ "released": true }`

---

## Therians (colección)

### `GET /api/therians/mine`

Devuelve todos los Therians del usuario (activos y en cápsula).

**Respuesta 200:** `TherianDTO[]`

---

### `GET /api/therians/capsules`

Devuelve los Therians en estado `capsule` del usuario.

**Respuesta 200:** `TherianDTO[]`

---

### `GET /api/therians/random`

Devuelve un Therian aleatorio para selección de oponente PvP.

**Respuesta 200:** `TherianDTO[]` (3 Therians activos de un usuario aleatorio)

---

### `GET /api/therians/search?q=<nombre>`

Busca Therians por nombre (público).

**Respuesta 200:** `TherianDTO[]`

---

## PvP

### `POST /api/pvp/start`

Crea una nueva batalla PvP 3v3.

**Body:**
```json
{ "attackerTeamIds": ["uuid1", "uuid2", "uuid3"] }
```

**Respuesta 200:**
```json
{
  "battleId": "uuid",
  "state": BattleState
}
```

**Flujo interno:**
1. Validar que los 3 Therians pertenecen al usuario y están `active`
2. Seleccionar oponente: usuario aleatorio con 3 Therians activos
3. Inicializar `BattleState` (auras, orden por agility)
4. Auto-resolver turnos de IA hasta que sea el turno del jugador
5. Persistir `PvpBattle` en DB
6. Devolver estado

**Errores:**
| Código | Status |
|--------|--------|
| `INVALID_TEAM` | 400 — menos de 3 o IDs inválidos |
| `NO_OPPONENT` | 404 — no hay oponentes disponibles |

---

### `GET /api/pvp/[id]`

Devuelve el estado actual de una batalla.

**Respuesta 200:** `{ "state": BattleState }`

**Respuesta 404:** `{ "error": "NOT_FOUND" }`

---

### `POST /api/pvp/[id]/action`

Ejecuta la acción del jugador en su turno.

**Body:**
```json
{ "abilityId": "for_regen", "targetId"?: "uuid" }
```

**Respuesta 200:** `{ "snapshots": TurnSnapshot[], "state": BattleState }`

`snapshots` contiene un snapshot por cada turno resuelto (turno del jugador + todos los turnos de IA siguientes). El cliente los reproduce con delays para animar la batalla.

**Flujo interno:**
1. Validar que es turno del jugador (`side === 'attacker'`)
2. Validar habilidad equipada y cooldown
3. Resolver turno del jugador
4. Auto-resolver todos los turnos de IA hasta el próximo turno del jugador (o fin de batalla)
5. Persistir `PvpBattle` actualizado
6. Devolver array de snapshots + estado final

**Errores:**
| Código | Status |
|--------|--------|
| `NOT_YOUR_TURN` | 409 |
| `ABILITY_NOT_EQUIPPED` | 400 |
| `ABILITY_ON_COOLDOWN` | 400 |
| `BATTLE_OVER` | 409 |

---

## Tienda

### `GET /api/shop`

Devuelve el catálogo completo de la tienda.

**Respuesta 200:**
```json
{
  "items": ShopItem[],
  "eggs": EggItem[],
  "wallet": { "gold": 1200, "essence": 3 }
}
```

---

### `POST /api/shop/buy`

Compra un artículo de la tienda.

**Body:**
```json
{ "itemId": "acc_crown", "therianId"?: "uuid" }
```

`therianId` requerido para artículos de tipo `cosmetic` que se equipan directamente.

**Respuesta 200:** `{ "success": true, "wallet": { "gold": N, "essence": N } }`

**Errores:**
| Código | Status |
|--------|--------|
| `ITEM_NOT_FOUND` | 404 |
| `INSUFFICIENT_FUNDS` | 402 |
| `ALREADY_OWNED` | 409 |

---

## Inventario

### `GET /api/inventory`

Devuelve el inventario de items del usuario.

**Respuesta 200:**
```json
{
  "items": [
    { "itemId": "egg_rare", "type": "EGG", "quantity": 2 },
    { "itemId": "acc_crown", "type": "ACCESSORY", "quantity": 1 }
  ]
}
```

---

## Wallet

### `GET /api/wallet`

Devuelve el balance actual del usuario.

**Respuesta 200:** `{ "gold": 1200, "essence": 3 }`

---

### `POST /api/wallet/exchange`

Intercambia gold por essence (o viceversa) a una tasa fija.

**Body:** `{ "from": "gold", "amount": 1000 }`

**Respuesta 200:** `{ "gold": N, "essence": N }`

---

## Leaderboard

### `GET /api/leaderboard`

Devuelve el ranking global de Therians.

**Respuesta 200:**
```json
{
  "entries": [
    {
      "rank": 1,
      "therian": TherianDTO,
      "score": 9800
    }
  ]
}
```

---

## TherianDTO — Tipo completo

```typescript
interface TherianDTO {
  id: string
  name: string | null
  bites: number
  species: { id: string; name: string; emoji: string; lore: string }
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
  trait: { id: string; name: string; lore: string }
  appearance: {
    palette: string
    paletteColors: { primary: string; secondary: string; accent: string }
    eyes: string
    pattern: string
    signature: string
  }
  stats: { vitality: number; agility: number; instinct: number; charisma: number }
  baseStats: { vitality: number; agility: number; instinct: number; charisma: number }
  equippedRunes: Rune[]
  equippedRunesIds: string[]
  level: number
  xp: number
  xpToNext: number
  lastActionAt: string | null
  canAct: boolean
  nextActionAt: null
  actionsUsed: number
  actionsMaxed: boolean
  actionGains: Record<string, number>
  canBite: boolean
  nextBiteAt: string | null
  equippedAccessories: Record<string, string>  // slot → accessoryId
  equippedAbilities: string[]
  status: string
  createdAt: string
}
```

`stats` incluye los bonificadores de runas aplicados. `baseStats` contiene los valores originales sin runas.
