# Sistema PvP 3v3

El sistema de combate por turnos enfrenta al equipo del jugador (3 Therians) contra un equipo oponente (3 Therians de otro usuario) controlado por la IA del servidor.

**Archivos relevantes:**
- `lib/pvp/types.ts` — todos los tipos TypeScript
- `lib/pvp/abilities.ts` — catálogo de habilidades
- `lib/pvp/engine.ts` — motor de combate (puro, sin DB)
- `lib/pvp/ai.ts` — decisiones de la IA
- `lib/pvp/energy.ts` — lógica de regeneración de energía
- `lib/pvp/mmr.ts` — sistema de MMR, rangos y recompensas
- `lib/catalogs/auras.ts` — catálogo de 40 auras
- `app/api/pvp/start/route.ts` — crear batalla
- `app/api/pvp/[id]/route.ts` — estado actual
- `app/api/pvp/[id]/action/route.ts` — ejecutar todos los turnos (pre-computado)
- `app/api/pvp/team/route.ts` — guardar/leer equipo predeterminado
- `app/api/pvp/status/route.ts` — energía, MMR y recompensas disponibles
- `app/api/pvp/ranking/route.ts` — ranking global top 10 por MMR
- `app/api/pvp/rewards/weekly/route.ts` — cofre semanal (GET + POST)
- `app/api/pvp/rewards/monthly/route.ts` — recompensa mensual (GET + POST)
- `app/api/therian/equip-abilities/route.ts` — equipar habilidades
- `components/pvp/PvpPageClient.tsx` — lobby completo
- `components/pvp/PvpRoom.tsx` — orquestador de fases
- `components/pvp/BattleField.tsx` — arena visual 4 fases (pre-computada)
- `components/pvp/TeamSetup.tsx` — selección/guardado de equipo
- `lib/pvp/__test__/pvp-full.test.ts` — 287+ tests del motor
- `lib/pvp/__test__/battlefield-ui.test.ts` — 77 tests de la UI de arena

---

## Flujo general

El sistema usa batallas **pre-computadas**: el servidor resuelve *todos* los turnos en una sola llamada y devuelve el array completo de snapshots. El cliente los reproduce con delays para la animación visual, pero la batalla ya está resuelta.

```
Lobby (PvpPageClient)
  ├── Sin equipo guardado → "Configura tu equipo" (redirige a TeamSetup)
  └── Con equipo guardado (3 IDs)
       ├── Verificar energía (⚡ 0–10)
       └── Clic "Batalla Clasificatoria"
             │
             ▼
  PvpRoom — fase: 'starting'
    └── POST /api/pvp/start { attackerTeamIds }
          │ servidor resuelve TODOS los turnos
          ▼
  PvpRoom — fase: 'battle'
    └── BattleField reproduce snapshots animados
          │ velocidad configurable (1× / 2× / 4×)
          ▼
  PvpRoom — fase: 'result'
    └── Pantalla victoria/derrota + MMR delta + oro ganado
```

### Gestión del equipo predeterminado

El usuario guarda un equipo de 3 Therians en su perfil (`savedPvpTeam` en User). Este equipo se usa automáticamente al iniciar batalla. Si uno de los Therians del equipo guardado ya no está activo (fusionado, liberado), se filtra y el equipo queda incompleto hasta que el usuario lo actualice.

```
GET /api/pvp/team  → { teamIds, therians[] }
POST /api/pvp/team { teamIds: [id1, id2, id3] } → { ok, teamIds }
```

### Energía PvP

Cada batalla consume 1 energía. La energía se regenera automáticamente a razón de 1 unidad cada 2 horas, hasta un máximo de 10. Si `pvpEnergy = 0`, no se puede iniciar batalla.

```
GET /api/pvp/status → { energy, energyMax, energyRegenAt, mmr, rank, ... }
```

---

## Tipos principales

### BattleState

```typescript
interface BattleState {
  slots:     TurnSlot[]        // 6 Therians ordenados por effectiveAgility desc
  turnIndex: number            // índice del slot cuyo turno es ahora
  round:     number
  auras:     Aura[]            // hasta 2 auras (una por equipo)
  log:       ActionLogEntry[]  // historial completo
  status:    'active' | 'completed'
  winnerId:  string | null     // userId del ganador, null = ganó el defensor
  auraState: {
    attacker: AuraRuntimeState
    defender: AuraRuntimeState
  }
}
```

### TurnSlot

```typescript
interface TurnSlot {
  therianId:         string
  side:              'attacker' | 'defender'
  archetype:         Archetype
  name:              string | null
  currentHp:         number
  maxHp:             number
  baseAgility:       number
  effectiveAgility:  number    // con buffs/debuffs aplicados
  vitality:          number
  instinct:          number
  charisma:          number
  shieldHp:          number    // escudo absorbente (recibe daño antes que currentHp)
  isLeader:          boolean   // true = mayor CHA del equipo (determina aura activa)
  equippedAbilities: string[]
  innateAbilityId:   string
  cooldowns:         Record<string, number>
  effects:           ActiveEffect[]
  isDead:            boolean
  avatarSnapshot?:   AvatarSnapshot  // datos de apariencia para el cliente
}
```

### AuraRuntimeState

Estado por equipo que persiste entre turnos dentro de una batalla:

```typescript
interface AuraRuntimeState {
  resurrectionUsed:  boolean         // Resurrección Silvestre (una vez)
  avatarUsed:        boolean         // Avatar de la Cascada (una vez)
  ceniCegadoraUsed:  boolean         // Ceniza Cegadora (una vez)
  fallenCount:       number          // Aliados muertos (Sacrificio Ígneo)
  tideSurge:         number          // Marea Creciente acumulado [0–0.20]
  llamaradaTurns:    number          // Turnos restantes del buff de Llamarada Vengativa
  circuitoStacks:    number          // Stacks de Circuito Sincronizado [0–3]
  lastAbilityArch:   string | null   // Arquetipo de la última habilidad usada
  shieldLastRefresh: number          // Ronda del último refresh (Escudo Hidráulico)
  velocidadActive:   boolean         // Velocidad Terminal activa en ronda 1
  tormentaTargetId:  string | null   // therianId con -10% def esta ronda (Tormenta de Iones)
}
```

### TurnSnapshot (para animación)

El servidor devuelve un snapshot por turno resuelto:

```typescript
interface TurnSnapshot {
  actorIndex: number       // índice del slot que actuó
  turnIndex:  number       // próximo en actuar
  round:      number
  slots:      SlotSnapshot[]
  logEntry:   ActionLogEntry
  status:     'active' | 'completed'
  winnerId:   string | null
}

interface SlotSnapshot {
  therianId:        string
  currentHp:        number
  maxHp:            number
  shieldHp:         number
  isDead:           boolean
  effects:          ActiveEffect[]
  cooldowns:        Record<string, number>
  effectiveAgility: number
}
```

---

## Fórmulas de combate

```typescript
HP_MAX        = 50 + vitality × 3
DAMAGE_BASE   = agility × 0.5 + 10
HEAL          = round(15 + vitality × 0.4) × abilityMultiplier
BLOCK_CHANCE  = instinct / 300          // 0–33% con instinct 0–100
BLOCK_DAMAGE  = incomingDamage × 0.40  // bloqueo reduce daño al 40%
AURA_VALUE    = charisma × 0.2
ARCHETYPE_BONUS = same archetype ? 1.15 : 1.0
```

### Fórmula de daño completa

```
raw = DAMAGE_BASE × abilityMultiplier × typeMultiplier × archetypeBonus
       × outgoingMod × incomingMod × actorDmgDebuff
raw -= shieldAbsorb   // escudo absorbe antes de HP
damage = max(1, round(raw))
```

Donde:
- `outgoingMod` — multiplicadores ofensivos del aura del atacante (ver hooks)
- `incomingMod` — multiplicadores defensivos del aura del defensor (ver hooks)
- `actorDmgDebuff` — debuff de daño activo: `1 + debuff.value`
- `shieldAbsorb` — daño absorbido por `target.shieldHp` antes de llegar a `currentHp`; bypass completo si aura tiene `lavaFundente`

**Evasión:**
```
missChance = base(0) + evasionBonus(aura def) - evasionReduction(aura atk)
if rng() < missChance → ataque falla
```

---

## Tabla de tipos elementales

```
Volcánico →  Forestal  ×1.25
Volcánico →  Acuático  ×0.75
Forestal  →  Acuático  ×1.25
Forestal  →  Volcánico ×0.75
Acuático  →  Volcánico ×1.25
Acuático  →  Forestal  ×0.75
Eléctrico →  todos     ×1.0  (neutral)
```

---

## Sistema de Auras

### Asignación

Cada Therian tiene un `auraId` permanente asignado al generarse (ver [generation.md](generation.md)). No cambia nunca.

Al inicio de la batalla, el Therian con mayor `charisma` de cada equipo es el **líder** (`isLeader = true`). Su aura personal es la aura activa para todo el equipo (persiste aunque el líder muera).

El `auraId` se resuelve contra el catálogo `lib/catalogs/auras.ts`. Si un Therian legacy no tiene `auraId`, se aplica un aura estándar por defecto según su arquetipo.

### Catálogo (40 auras)

10 auras por arquetipo, en 3 tiers:

| Tier | Índices | Label | Rareza de asignación |
|------|---------|-------|----------------------|
| `standard` | 1–4 | Estándar | COMMON / UNCOMMON / RARE |
| `premium` | 5–7 | Premium | EPIC (30%) |
| `premium_plus` | 8–10 | Legendario | LEGENDARY (50%) / MYTHIC (100%) |

#### 🌿 Forestal — Supervivencia y Desgaste

| ID | Nombre | Tier | Efecto resumido |
|----|--------|------|-----------------|
| `for_vigor_roble` | Vigor del Roble | Estándar | `maxHp += VIT × 0.5` a todos los aliados |
| `for_capa_musgo` | Capa de Musgo | Estándar | -5% daño de ataques básicos recibidos |
| `for_raices_hierro` | Raíces de Hierro | Estándar | `incomingDmg *= (1 - min(CHA×0.003, 0.15))` |
| `for_savia_vida` | Savia de Vida | Estándar | Curación recibida ×1.10 |
| `for_polen_sedante` | Polen Sedante | Premium | Al inicio: 15% chance AGI enemiga -10% |
| `for_espinas_pantano` | Espinas del Pantano | Premium | `CHA × 0.08` dmg al atacante por hit recibido |
| `for_ecosistema_fertil` | Ecosistema Fértil | Premium | `VIT × 0.04` HP/ronda al aliado con menos HP |
| `for_santuario_ancestral` | Santuario Ancestral | Premium+ | Escudo inicial `CHA × 1.5` HP por slot |
| `for_ira_bosque` | Ira del Bosque | Premium+ | `+VIT × 0.05` daño plano por hit |
| `for_resurreccion_silvestre` | Resurrección Silvestre | Premium+ | Un aliado sobrevive muerte con 1 HP (una vez) |

#### 🔥 Volcánico — Poder Ofensivo y Caos

| ID | Nombre | Tier | Efecto resumido |
|----|--------|------|-----------------|
| `vol_fervor_magma` | Fervor de Magma | Estándar | `+AGI × 0.08` daño plano por hit |
| `vol_caldera_odio` | Caldera de Odio | Estándar | Crit ×1.65 (extra ×1.10 sobre base ×1.5) |
| `vol_ceniza_cegadora` | Ceniza Cegadora | Estándar | Primer ataque enemigo 10% de fallar (one-time) |
| `vol_presion_tectonica` | Presión Tectónica | Estándar | `damageMod *= 1.05` siempre |
| `vol_insignia_azufre` | Insignia de Azufre | Premium | +10% daño si target tiene debuff activo |
| `vol_llamarada_vengativa` | Llamarada Vengativa | Premium | Al recibir crítico: +8% daño 2 turnos |
| `vol_nucleo_erupcion` | Núcleo en Erupción | Premium | Al morir aliado: `AGI × 0.25` dmg a cada enemigo vivo |
| `vol_supernova_primordial` | Supernova Primordial | Premium+ | `damageMod *= 1.35` en rondas 1–2 |
| `vol_sacrificio_igneo` | Sacrificio Ígneo | Premium+ | +12% daño por aliado caído (cap +36%) |
| `vol_lava_fundente` | Lava Fundente | Premium+ | Ataques ignoran escudos (`shieldHp` bypass) |

#### 💧 Acuático — Estrategia y Control

| ID | Nombre | Tier | Efecto resumido |
|----|--------|------|-----------------|
| `acu_muralla_coral` | Muralla de Coral | Estándar | `maxHp += CHA × 0.3` a todos los aliados |
| `acu_niebla_abismo` | Niebla del Abismo | Estándar | +5% miss chance al atacante |
| `acu_corriente_retorno` | Corriente de Retorno | Estándar | 10% por acción de reducir CD aleatorio en 1 |
| `acu_fluidez_manantial` | Fluidez de Manantial | Estándar | 50% chance de ignorar stun |
| `acu_escudo_hidraulico` | Escudo Hidráulico | Premium | Escudo `CHA × 1.0` HP por slot, refresh cada 3 rondas |
| `acu_marea_creciente` | Marea Creciente | Premium | +2% daño por ronda (cap +20%) |
| `acu_bendicion_profundidades` | Bendición de las Profundidades | Premium | 20% del heal también al aliado con menos HP |
| `acu_ojo_tormenta` | Ojo de la Tormenta | Premium+ | 20% chance de reflejar debuffs al atacante |
| `acu_abismo_calma` | Abismo de Calma | Premium+ | `dmg × 0.75` si habilidad es AoE (`target: 'all'`) |
| `acu_avatar_cascada` | Avatar de la Cascada | Premium+ | El líder sobrevive primer golpe mortal con 1 HP (one-time) |

#### ⚡ Eléctrico — Velocidad y Disrupción

| ID | Nombre | Tier | Efecto resumido |
|----|--------|------|-----------------|
| `ele_pulso_galvanico` | Pulso Galvánico | Estándar | `effectiveAgility += AGI × 0.1` a todos |
| `ele_carga_estatica` | Carga Estática | Estándar | `+CHA × 0.15` dmg extra en ataques básicos (innatos) |
| `ele_sentido_voltaico` | Sentido Voltaico | Estándar | -10% miss chance del rival (neta con Niebla) |
| `ele_sobrecarga_energetica` | Sobrecarga Energética | Estándar | `instinct += CHA × 0.1` a todos (mejora crit) |
| `ele_circuito_sincronizado` | Circuito Sincronizado | Premium | +5% AGI por stack al usar habilidad propia del arquetipo (max 3 stacks) |
| `ele_voltaje_asalto` | Voltaje de Asalto | Premium | `damageMod += actor.effectiveAgility / 1000` |
| `ele_tormenta_iones` | Tormenta de Iones | Premium | Al inicio de cada ronda: -10% defenseMod a un enemigo aleatorio |
| `ele_relampago_cadena` | Relámpago en Cadena | Premium+ | Críticos tienen 30% de golpear un 2.º objetivo con 50% daño |
| `ele_velocidad_terminal` | Velocidad Terminal | Premium+ | Ronda 1: todo el equipo actúa primero (+9999 AGI temp) |
| `ele_singularidad_plasma` | Singularidad de Plasma | Premium+ | 10% chance de añadir +1 CD a una habilidad aleatoria del objetivo |

### Arquitectura de hooks

El engine aplica auras mediante hooks en puntos concretos del loop de batalla:

| Hook | Cuándo se llama | Ejemplos |
|------|-----------------|----------|
| `applyInitAuras` | Al crear `initBattleState()` | HP bonus, AGI bonus, shields, Velocidad Terminal, Polen Sedante, Ceniza Cegadora |
| `applyRoundStartHooks` | Al iniciar cada nueva ronda | Ecosistema Fértil, Marea Creciente, Escudo Hidráulico refresh, Tormenta de Iones, reset de Velocidad Terminal en ronda 2 |
| `applyOnActionHooks` | Tras cada acción del actor | Corriente de Retorno (CD), Circuito Sincronizado (stacks) |
| `applyOnDeathHooks` | Al marcar `isDead = true` | Núcleo en Erupción, incremento de `fallenCount` (Sacrificio Ígneo) |
| `applyOnCritReceivedHooks` | Cuando el slot recibe un crítico | Llamarada Vengativa (buff daño 2T) |
| `checkSurvival` | Antes de marcar HP ≤ 0 | Resurrección Silvestre, Avatar de la Cascada |
| `modifyOutgoingDamage` | Calculando daño del atacante | Todos los flatBonus, critMultiplier, Supernova, Sacrificio, vsBuff, Voltaje de Asalto… |
| `modifyIncomingDamage` | Calculando daño del defensor | Reducción básica, Raíces, Abismo de Calma, evasión, Lava Fundente bypass |
| `applyChainLightning` | En críticos del equipo eléctrico | Relámpago en Cadena (segundo objetivo) |
| `tryReflectDebuff` | Al recibir debuff | Ojo de la Tormenta (reflect 20%) |
| `trySingularidadPlasma` | Por hit del equipo eléctrico | +1 CD a habilidad aleatoria del objetivo (10%) |
| `applyOnHitHooks` | Al recibir cualquier hit | Espinas del Pantano (thorns), Bendición de las Profundidades |

---

## Catálogo de Habilidades

### Ataques Innatos (no ocupan slot)

| ID | Nombre | Arquetipo | Target | Daño |
|----|--------|-----------|--------|------|
| `basic_forestal` | Zarpazo de Raíz | 🌿 | single | ×1.0 |
| `basic_electrico` | Descarga | ⚡ | single | ×1.0 |
| `basic_acuatico` | Oleada | 💧 | single | ×1.0 |
| `basic_volcanico` | Llamarada | 🔥 | single | ×1.0 |

### Habilidades Equipables (máx. 4 por Therian)

#### 🌿 Forestal

| ID | Nombre | Tipo | CD | Target | Efecto |
|----|--------|------|----|--------|--------|
| `for_regen` | Regeneración | activo | 3 | self | Curación ×1.0 |
| `for_enred` | Enredadera | activo | 4 | single | Debuff agility −25% / 2T |
| `for_espinas` | Espinas | pasivo | — | self | Refleja 15% del daño recibido |

#### ⚡ Eléctrico

| ID | Nombre | Tipo | CD | Target | Efecto |
|----|--------|------|----|--------|--------|
| `ele_rayo` | Rayo Paralizante | activo | 5 | single | Daño ×0.8 + Stun 1T |
| `ele_sobre` | Sobrecarga | activo | 4 | self | Buff agility +30% / 2T |
| `ele_cond` | Conductividad | pasivo | — | self | Tiebreaker en empate de agility |

#### 💧 Acuático

| ID | Nombre | Tipo | CD | Target | Efecto |
|----|--------|------|----|--------|--------|
| `acu_marea` | Marea Curativa | activo | 3 | ally | Curación ×1.0 |
| `acu_tsun` | Tsunami | activo | 5 | all | Daño ×0.6 a todos los enemigos |
| `acu_fluid` | Fluidez | pasivo | — | self | Reduce daño recibido 15% |

#### 🔥 Volcánico

| ID | Nombre | Tipo | CD | Target | Efecto |
|----|--------|------|----|--------|--------|
| `vol_erup` | Erupción | activo | 4 | all | Daño ×0.6 a todos los enemigos |
| `vol_intim` | Intimidar | activo | 4 | all | Debuff damage −20% / 2T a todos |
| `vol_aura` | Aura Ígnea | pasivo | — | self | Refleja 20% del daño recibido |

---

## Flujo de un turno (motor)

```
1. Obtener actor = slots[turnIndex]
2. Si actor.effects contiene stun → skip (decrementar efectos/CD, avanzar turno)
3. Resolver habilidad:
   a. Resolver targets según ability.target
   b. Para cada target:
      - Calcular daño (con todas las multiplicaciones)
      - ¿Bloquea? → RNG < blockChance → daño al 40%
      - Aplicar reflect si target tiene Espinas / Aura Ígnea
      - Aplicar daño / curación / stun / buff / debuff
      - Marcar isDead si HP ≤ 0
   c. Aplicar reflect acumulado al actor
4. Decrementar cooldowns del actor
5. Decrementar turnsRemaining de efectos activos del actor
6. Verificar condición de victoria
7. Avanzar turnIndex al siguiente vivo (circular)
8. Si el índice bajó → incrementar round
```

---

## IA del defensor

```typescript
function aiDecide(slot: TurnSlot, state: BattleState): AIAction {
  const enemies = state.slots.filter(s => s.side !== slot.side && !s.isDead)

  // 1. HP < 30% + curación disponible → curar
  if (slot.currentHp / slot.maxHp < 0.3) {
    const cure = findHealAbility(slot)
    if (cure) return { abilityId: cure.id }
  }

  // 2. Buscar enemigo débil al arquetipo del actor
  const weak = enemies.find(e => getTypeMultiplier(slot.archetype, e.archetype) > 1.0)
  const target = weak ?? enemies[0]

  // 3. Mejor habilidad ofensiva disponible (mayor daño, no en cooldown)
  const best = bestOffensive(slot)
  return { abilityId: best.id, targetId: target.therianId }
}
```

---

## Orden de turnos

Los slots se ordenan al inicio por `effectiveAgility` descendente. El orden no cambia durante la batalla (los debuffs de agility modifican el valor pero no reordenan). El Therian con Conductividad (`ele_cond`) gana los empates.

---

## Persistencia

`PvpBattle.state` almacena el `BattleState` serializado como JSON. Tras cada llamada a `/api/pvp/[id]/action`, se actualiza con el estado final. Las batallas completadas permanecen en DB (status `'completed'`).

Un usuario solo puede tener **una batalla activa** a la vez. Si existe una al cargar `/pvp`, se recarga automáticamente.

---

## Sistema MMR y Rangos

El MMR (Match Making Rating) determina el rango competitivo del usuario.

| Rango | MMR mínimo |
|-------|------------|
| Bronce | 0 |
| Plata | 600 |
| Oro | 1000 |
| Platino | 1400 |
| Diamante | 1800 |
| Maestro | 2200 |

### Variación de MMR por batalla

```
Victoria: +20 MMR  (−5 si el oponente tiene mucho menos MMR)
Derrota:  −15 MMR  (mínimo 0)
Oro ganado por victoria: 50–100 gold según rango del rival
```

### Ranking

`GET /api/pvp/ranking` devuelve el top 10 global por MMR + la posición del usuario autenticado si no está en el top.

```json
{
  "entries": [
    { "position": 1, "name": "Usuario", "mmr": 2500, "rank": "Maestro", "isCurrentUser": false }
  ],
  "currentUser": { "position": 15, "mmr": 1200, "rank": "Oro", "isCurrentUser": true }
}
```

---

## Sistema de Recompensas

### Cofre Semanal

Al acumular **15 victorias en la semana**, se desbloquea el cofre semanal (claimable una vez por período).

`GET /api/pvp/rewards/weekly` — Estado del cofre (disponible, ya reclamado, victorias actuales).

`POST /api/pvp/rewards/weekly` — Reclamar cofre. Otorga:
- 800 gold
- 1 huevo (tier según rango)
- 2 runas aleatorias del pool T1

```json
{ "gold": 800, "egg": "egg_rare", "runes": ["v_1", "a_2"] }
```

**Errores:**
| Código | Status |
|--------|--------|
| `NOT_ENOUGH_WINS` | 400 — victorias insuficientes |
| `ALREADY_CLAIMED` | 409 — ya reclamado en este período |

### Recompensa Mensual

Al inicio de cada mes se puede reclamar una recompensa basada en el **rango pico** alcanzado durante el mes.

`GET /api/pvp/rewards/monthly` — Estado de la recompensa mensual.

`POST /api/pvp/rewards/monthly` — Reclamar recompensa mensual.

---

## Tests

```bash
# Motor de combate (287+ tests)
npx tsx lib/pvp/__test__/pvp-full.test.ts

# UI de arena — funciones puras (77 tests)
npx tsx lib/pvp/__test__/battlefield-ui.test.ts
```

Los tests de battlefield-ui cubren:
- `describeAbility()` — descripción legible para los 16 tipos de efecto
- `hpBarColor()` — umbrales de color de barra de HP
- `resultLines()` — formateo de resultados de turno
- `applySnapshot()` — aplicación correcta de snapshots con edge cases
