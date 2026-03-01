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

Lanza una pelea automática contra otro Therian (cooldown 3 min). Si no se especifica `targetName`, elige un rival aleatorio compatible en rareza (máx. ±2 niveles). Solo se puede morder a Therians con nombre.

**Body:**
```json
{ "therianId"?: "uuid", "targetName"?: "NombreRival" }
```

- `therianId`: Therian propio que pelea (por defecto el primero activo).
- `targetName`: Nombre del rival específico a atacar. Si se omite, elige aleatoriamente.

**Respuesta 200:**
```json
{
  "battle": { "winner": "challenger" | "target", "rounds": [...] },
  "challenger": TherianDTO,
  "target": TherianDTO,
  "biteAwarded": true,
  "goldEarned": 10,
  "xpEarned": 10
}
```

`target` refleja el estado post-pelea del rival (deaths actualizado). Si el retador gana: gana 10 gold, 10 XP y +1 bite. Si pierde: +1 death.

**Errores:**
| Código | Status | Descripción |
|--------|--------|-------------|
| `COOLDOWN_ACTIVE` | 429 | Cooldown activo; incluye `nextBiteAt` |
| `NO_TARGETS_AVAILABLE` | 404 | No hay rivales compatibles disponibles |
| `TARGET_NOT_FOUND` | 404 | El `targetName` especificado no existe |
| `CANNOT_BITE_SELF` | 400 | No se puede pelear contra uno mismo |
| `RARITY_MISMATCH` | 400 | El rival está fuera del rango de rareza permitido |
| `NO_THERIAN` | 404 | El usuario no tiene Therian activo |

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

Fusiona 3 slots (Therians + huevos) del mismo tier de rareza para generar uno de rareza superior. Los accesorios equipados en los Therians fusionados se devuelven al inventario antes de eliminarlos.

**Body:**
```json
{
  "therianIds": ["uuid1", "uuid2"],
  "eggUses": [{ "itemId": "egg_rare", "qty": 1 }]
}
```

La suma de `therianIds.length + eggUses[].qty` debe ser exactamente **3**. Todos los slots deben ser del mismo nivel de rareza.

**Respuesta 200:**
```json
{
  "success": true,
  "therian": TherianDTO,
  "resultRarity": "RARE",
  "successRate": 0.70
}
```

Si la fusión falla (según `successRate`), `success` es `false` y el nuevo Therian mantiene la rareza base.

**Tasas de éxito por rareza base:**
| Rareza | Probabilidad de subir |
|--------|-----------------------|
| COMMON | 100 % |
| UNCOMMON | 70 % |
| RARE | 50 % |
| EPIC | 20 % |
| LEGENDARY | 5 % |

**Errores:**
| Código | Status | Descripción |
|--------|--------|-------------|
| `INVALID_SELECTION` | 400 | Total de slots ≠ 3 o IDs duplicados |
| `INVALID_THERIANS` | 400 | Algún Therian no pertenece al usuario |
| `RARITY_MISMATCH` | 400 | Los slots no son del mismo tier de rareza |
| `INVALID_EGG` | 400 | ID de huevo no existe en el catálogo |
| `INSUFFICIENT_EGGS` | 400 | No hay suficientes huevos en el inventario |
| `MAX_RARITY` | 400 | La rareza base es MYTHIC (máximo) |

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

Devuelve un Therian activo y con nombre aleatorio para selección de rival en Bite. Excluye Therians del usuario autenticado.

**Query params:**
- `therianId` (opcional): ID del Therian retador. Cuando se provee, filtra rivales a ±2 tiers de rareza respecto al retador.

**Respuesta 200:** `TherianDTO` (un único Therian)

**Respuesta 404:** `{ "error": "NO_THERIANS" }` — no hay rivales disponibles

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

Ejecuta **todos** los turnos de la batalla en una sola llamada (pre-computado). El servidor resuelve todos los turnos del juego y devuelve el array completo de snapshots para que el cliente los anime como un replay.

**Body:** `{}` (vacío — la IA toma todas las decisiones)

**Respuesta 200:**
```json
{
  "snapshots": TurnSnapshot[],
  "state": BattleState,
  "mmrDelta": 20,
  "newMmr": 1220,
  "rank": "Plata",
  "goldEarned": 75,
  "weeklyPvpWins": 3
}
```

`snapshots` contiene un snapshot por turno. El cliente los reproduce con el delay configurado (1× = 1600 ms, 2× = 800 ms, 4× = 350 ms). `mmrDelta` y el resto de campos de recompensa solo aparecen cuando `state.status === 'completed'`.

**Flujo interno:**
1. Resolver todos los turnos (motor puro, sin interactividad)
2. Persistir estado final en `PvpBattle`
3. Si batalla completada: calcular MMR delta, gold, actualizar victorias semanales
4. Devolver array de snapshots + estado final + recompensas

**Errores:**
| Código | Status |
|--------|--------|
| `BATTLE_OVER` | 409 — la batalla ya estaba completada |
| `NOT_FOUND` | 404 |

---

### `GET /api/pvp/team`

Devuelve el equipo predeterminado guardado del usuario.

**Respuesta 200:**
```json
{
  "teamIds": ["uuid1", "uuid2", "uuid3"],
  "therians": [TherianDTO, TherianDTO, TherianDTO]
}
```

Si no hay equipo guardado: `{ "teamIds": [], "therians": [] }`

---

### `POST /api/pvp/team`

Guarda el equipo predeterminado del usuario.

**Body:** `{ "teamIds": ["uuid1", "uuid2", "uuid3"] }`

Valida que los 3 Therians pertenecen al usuario y están `active`.

**Respuesta 200:** `{ "ok": true, "teamIds": ["uuid1", "uuid2", "uuid3"] }`

**Errores:**
| Código | Status |
|--------|--------|
| `INVALID_TEAM` | 400 — menos de 3, IDs inválidos o Therians no activos |
| `INVALID_INPUT` | 400 — formato incorrecto |

---

### `GET /api/pvp/status`

Devuelve el estado completo de PvP del usuario: energía, MMR, rangos y disponibilidad de recompensas.

**Respuesta 200:**
```json
{
  "mmr": 1200,
  "rank": "Plata",
  "peakMmr": 1350,
  "peakRank": "Oro",
  "weeklyPvpWins": 7,
  "weeklyRequired": 15,
  "chestAvailable": false,
  "alreadyClaimedChest": false,
  "energy": 8,
  "energyMax": 10,
  "energyRegenAt": "2026-03-01T12:00:00.000Z",
  "currentMonth": "2026-03",
  "monthlyReward": { "gold": 1500 },
  "alreadyClaimedMonthly": false
}
```

La energía se regenera automáticamente al consultar este endpoint si corresponde (dirty write). `energyRegenAt` indica cuándo se regenerará la siguiente unidad.

---

### `GET /api/pvp/ranking`

Devuelve el ranking global top 10 por MMR.

**Respuesta 200:**
```json
{
  "entries": [
    { "position": 1, "name": "Usuario", "mmr": 2500, "rank": "Maestro", "isCurrentUser": false }
  ],
  "currentUser": { "position": 15, "mmr": 1200, "rank": "Plata", "isCurrentUser": true }
}
```

`currentUser` es `null` si el usuario autenticado está en el top 10 (ya aparece en `entries`).

---

### `GET /api/pvp/rewards/weekly`

Estado del cofre semanal.

**Respuesta 200:**
```json
{
  "weeklyPvpWins": 7,
  "required": 15,
  "chestAvailable": false,
  "alreadyClaimed": false,
  "weekResetAt": "2026-03-07T00:00:00.000Z",
  "preview": { "gold": 800, "egg": "egg_rare", "runes": 2 }
}
```

### `POST /api/pvp/rewards/weekly`

Reclama el cofre semanal (requiere ≥ 15 victorias en el período).

**Respuesta 200:**
```json
{ "gold": 800, "egg": "egg_rare", "runes": ["v_1", "a_2"] }
```

**Errores:**
| Código | Status |
|--------|--------|
| `NOT_ENOUGH_WINS` | 400 |
| `ALREADY_CLAIMED` | 409 |

---

### `GET /api/pvp/rewards/monthly`

Estado de la recompensa mensual (basada en rango pico del mes).

### `POST /api/pvp/rewards/monthly`

Reclama la recompensa mensual.

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
{
  "itemId": "acc_crown",
  "quantity"?: 1,
  "newName"?: "NuevoNombre",
  "therianId"?: "uuid"
}
```

- `therianId`: Para artículos de tipo `rename`, selecciona a qué Therian aplicar el cambio de nombre (por defecto el primero). Para cosméticos, actualmente no se usa en el servidor.
- `newName`: Requerido cuando `itemId === "rename"`.
- `quantity`: Solo para huevos (1–99).

**Respuesta 200:**
```json
{
  "success": true,
  "newBalance": { "gold": N, "essence": N, "therianSlots": N },
  "updatedTherian"?: TherianDTO,
  "achievementUnlocked"?: { "id": "en_aventura", "title": "En Aventura", "rewardLabel": "🪙 +500 Oro" }
}
```

`updatedTherian` está presente solo cuando el artículo es `rename`. `achievementUnlocked` aparece la primera vez que se compra un slot extra.

**Errores:**
| Código | Status | Descripción |
|--------|--------|-------------|
| `ITEM_NOT_FOUND` | 404 | ID no existe en el catálogo |
| `INSUFFICIENT_ESSENCIA` | 400 | Saldo de gold insuficiente |
| `INSUFFICIENT_COIN` | 400 | Saldo de essence insuficiente |
| `NAME_REQUIRED` | 400 | Falta `newName` al renombrar |
| `NAME_TAKEN` | 409 | El nombre ya está en uso |
| `NO_THERIAN` | 404 | No existe Therian para aplicar el rename |
| `MAX_SLOTS_REACHED` | 400 | El usuario ya tiene 8 slots |

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

Devuelve el ranking de combate global (ordenado por `bites` desc). La página `/leaderboard` agrega un segundo tab de ranking por nivel de cuenta, que se calcula server-side.

**Query params:**
- `limit` (opcional, default 20, máx 50): Número de entradas a devolver.

**Respuesta 200:**
```json
{
  "entries": [
    {
      "rank": 1,
      "id": "uuid",
      "name": "NombreTherian",
      "species": { "id": "fox", "name": "Zorro", "emoji": "🦊" },
      "rarity": "EPIC",
      "bites": 42,
      "appearance": {
        "palette": "ember",
        "paletteColors": { "primary": "#C0392B", "secondary": "#E67E22", "accent": "#F39C12" },
        "eyes": "sharp",
        "pattern": "solid",
        "signature": "tail_fluffy"
      }
    }
  ],
  "userRank": 7
}
```

`userRank` es el puesto del Therian del usuario autenticado (basado en `bites`). `null` si no hay sesión o el usuario no tiene Therian con nombre.

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
