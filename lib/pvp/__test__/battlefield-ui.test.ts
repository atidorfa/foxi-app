/**
 * Tests para las funciones puras de BattleField.tsx
 * Ejecutar con:  npx tsx lib/pvp/__test__/battlefield-ui.test.ts
 *
 * Cubre:
 *  ✓ Phase 1 — describeAbility: descripción legible para cada tipo de efecto
 *  ✓ Phase 1 — hpBarColor: colores correctos por umbral de HP
 *  ✓ Phase 2 — resultLines: líneas de resultado desde ActionLogEntry
 *  ✓ Phase 3 — float number label generation (through resultLines)
 *  ✓ General — applySnapshot: aplica snapshots correctamente con edge cases
 */

import { describeAbility, hpBarColor, resultLines, applySnapshot } from '../../../components/pvp/BattleField'
import { ABILITY_BY_ID, INNATE_ABILITIES, ABILITIES } from '../abilities'
import type { Ability, BattleState, TurnSnapshot, ActionLogEntry, TurnSlot } from '../types'

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${msg}`)
    failed++
  }
}

function assertEq<T>(a: T, b: T, msg: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b)
  if (ok) {
    console.log(`  ✓ ${msg}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${msg}\n    got:      ${JSON.stringify(a)}\n    expected: ${JSON.stringify(b)}`)
    failed++
  }
}

function section(name: string) {
  console.log(`\n═══ ${name} ═══`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSlot(overrides: Partial<TurnSlot> = {}): TurnSlot {
  return {
    therianId: 'slot-1',
    side: 'attacker',
    archetype: 'forestal',
    name: 'TestSlot',
    currentHp: 100,
    maxHp: 100,
    baseAgility: 20,
    effectiveAgility: 20,
    vitality: 30,
    instinct: 20,
    charisma: 20,
    equippedAbilities: [],
    equippedPassives: [],
    innateAbilityId: 'basic_forestal',
    cooldowns: {},
    effects: [],
    isDead: false,
    shieldHp: 0,
    endureUsed: false,
    isLeader: false,
    ...overrides,
  }
}

function makeBattleState(slots: Partial<TurnSlot>[] = []): BattleState {
  const defaultSlots = [
    makeSlot({ therianId: 'a1', side: 'attacker', currentHp: 80, maxHp: 100 }),
    makeSlot({ therianId: 'a2', side: 'attacker', currentHp: 50, maxHp: 100 }),
    makeSlot({ therianId: 'd1', side: 'defender', currentHp: 100, maxHp: 120 }),
  ]
  return {
    slots: slots.length ? slots.map(makeSlot) : defaultSlots,
    turnIndex: 0,
    round: 1,
    auras: [],
    auraState: {
      attacker: {
        resurrectionUsed: false, avatarUsed: false, ceniCegadoraUsed: false,
        fallenCount: 0, tideSurge: 0, llamaradaTurns: 0, circuitoStacks: 0,
        lastAbilityArch: null, shieldLastRefresh: 0, velocidadActive: false, tormentaTargetId: null,
      },
      defender: {
        resurrectionUsed: false, avatarUsed: false, ceniCegadoraUsed: false,
        fallenCount: 0, tideSurge: 0, llamaradaTurns: 0, circuitoStacks: 0,
        lastAbilityArch: null, shieldLastRefresh: 0, velocidadActive: false, tormentaTargetId: null,
      },
    },
    log: [],
    status: 'active',
    winnerId: null,
  }
}

function makeLogEntry(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  return {
    turn: 1,
    actorId: 'a1',
    actorName: 'Lobo',
    abilityId: 'basic_forestal',
    abilityName: 'Zarpazo de Raíz',
    targetIds: ['d1'],
    results: [],
    ...overrides,
  }
}

function makeSnapshot(overrides: Partial<TurnSnapshot> = {}): TurnSnapshot {
  return {
    actorIndex: 0,
    turnIndex: 1,
    round: 1,
    slots: [
      { therianId: 'a1', currentHp: 75, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'a2', currentHp: 50, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'd1', currentHp: 85, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
    logEntry: makeLogEntry(),
    status: 'active',
    winnerId: null,
    ...overrides,
  }
}

// ─── Phase 1: describeAbility ─────────────────────────────────────────────────

section('Phase 1 — describeAbility()')

// Basic attacks (damage multiplier)
{
  const ab = ABILITY_BY_ID['basic_forestal']
  assert(!!ab, 'basic_forestal exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Daño base'), 'basic_forestal describes damage')
  assert(desc.includes('×1'), 'basic_forestal shows ×1.0 multiplier')
}

{
  const ab = ABILITY_BY_ID['acu_corriente'] // Corriente Gélida: damage 1.2 + debuff agility
  assert(!!ab, 'acu_corriente exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Daño base ×1.2'), 'acu_corriente shows correct damage multiplier')
}

// Heal abilities
{
  const ab = ABILITY_BY_ID['for_regen'] // Regeneración: heal 1.0
  assert(!!ab, 'for_regen exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Curación base'), 'for_regen describes healing')
  assert(desc.includes('×1'), 'for_regen shows ×1.0 heal multiplier')
}

{
  const ab = ABILITY_BY_ID['acu_marea'] // Marea Curativa: heal 1.0, target ally
  assert(!!ab, 'acu_marea exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Curación base'), 'acu_marea describes healing')
}

// Stun + damage combo
{
  const ab = ABILITY_BY_ID['ele_rayo'] // Rayo Paralizante: damage 0.8, stun 1
  assert(!!ab, 'ele_rayo exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Daño base'), 'ele_rayo describes damage')
  assert(desc.includes('Aturde 1 turno'), 'ele_rayo describes stun (singular)')
}

// Buff (agility)
{
  const ab = ABILITY_BY_ID['ele_sobre'] // Sobrecarga: buff agility +30% 2t
  assert(!!ab, 'ele_sobre exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('+30%'), 'ele_sobre shows +30%')
  assert(desc.includes('agility'), 'ele_sobre shows stat name')
  assert(desc.includes('2 turnos'), 'ele_sobre shows turn count')
}

// Debuff (agility)
{
  const ab = ABILITY_BY_ID['for_enred'] // Enredadera: debuff agility -25% 2t
  assert(!!ab, 'for_enred exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('-25%'), 'for_enred shows -25%')
  assert(desc.includes('agility'), 'for_enred shows stat name')
}

// Debuff (damage)
{
  const ab = ABILITY_BY_ID['vol_intim'] // Intimidar: debuff damage -20% 2t
  assert(!!ab, 'vol_intim exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('-20%'), 'vol_intim shows -20%')
  assert(desc.includes('damage'), 'vol_intim shows damage stat')
}

// Reflect passive
{
  const ab = ABILITY_BY_ID['for_espinas'] // Espinas: reflect 0.15
  assert(!!ab, 'for_espinas exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Refleja 15%'), 'for_espinas shows 15% reflect')
}

{
  const ab = ABILITY_BY_ID['vol_aura'] // Aura Ígnea: reflect 0.20
  assert(!!ab, 'vol_aura exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Refleja 20%'), 'vol_aura shows 20% reflect')
}

// Damage reduction passive
{
  const ab = ABILITY_BY_ID['acu_fluid'] // Fluidez: damageReduction 0.15
  assert(!!ab, 'acu_fluid exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Reduce 15%'), 'acu_fluid shows 15% damage reduction')
}

// Tiebreaker passive
{
  const ab = ABILITY_BY_ID['ele_cond'] // Conductividad: tiebreaker true
  assert(!!ab, 'ele_cond exists in ABILITY_BY_ID')
  const desc = describeAbility(ab)
  assert(desc.includes('Actúa primero en empates'), 'ele_cond shows tiebreaker text')
}

// Empty effect → empty string
{
  const fakeAb: Ability = {
    id: 'fake', name: 'Fake', archetype: 'forestal', type: 'passive', cooldown: 0, target: 'self', effect: {}
  }
  const desc = describeAbility(fakeAb)
  assertEq(desc, '', 'empty effect produces empty string')
}

// Multi-effect: damage + stun
{
  const ab: Ability = {
    id: 'test_multi',
    name: 'Multi',
    archetype: 'electrico',
    type: 'active',
    cooldown: 3,
    target: 'single',
    effect: { damage: 1.2, stun: 2 },
  }
  const desc = describeAbility(ab)
  assert(desc.includes('Daño base ×1.2'), 'multi-effect includes damage')
  assert(desc.includes('Aturde 2 turnos'), 'multi-effect includes stun plural')
  assert(desc.includes('. '), 'multi-effect uses ". " separator')
}

// All 16 abilities produce non-empty descriptions
{
  const allAbilities = [...INNATE_ABILITIES, ...ABILITIES]
  let allNonEmpty = true
  for (const ab of allAbilities) {
    const desc = describeAbility(ab)
    if (desc.length === 0) {
      console.error(`  ✗ FAIL: ${ab.id} produced empty description`)
      allNonEmpty = false
      failed++
    }
  }
  if (allNonEmpty) {
    console.log(`  ✓ All ${allAbilities.length} abilities produce non-empty descriptions`)
    passed++
  }
}

// ─── Phase 1: hpBarColor ──────────────────────────────────────────────────────

section('Phase 1 — hpBarColor()')

assertEq(hpBarColor(100, 100), 'bg-emerald-500', '100% HP → emerald')
assertEq(hpBarColor(61,  100), 'bg-emerald-500', '61% HP → emerald')
assertEq(hpBarColor(60,  100), 'bg-amber-500',   '60% HP → amber (≤60)')
assertEq(hpBarColor(31,  100), 'bg-amber-500',   '31% HP → amber')
assertEq(hpBarColor(30,  100), 'bg-red-500',     '30% HP → red (≤30)')
assertEq(hpBarColor(1,   100), 'bg-red-500',     '1% HP → red')
assertEq(hpBarColor(0,   100), 'bg-red-500',     '0% HP → red')
assertEq(hpBarColor(0,   0),   'bg-red-500',     'max=0 → red (no division by zero)')
assertEq(hpBarColor(50,  80),  'bg-emerald-500', '62.5% HP (50/80) → emerald (>60%)')
assertEq(hpBarColor(48,  80),  'bg-amber-500',   '60% HP (48/80) → amber (exactly at boundary)')

// ─── Phase 2: resultLines ─────────────────────────────────────────────────────

section('Phase 2 — resultLines()')

// Stun turn (actor was stunned, no real action)
{
  const entry = makeLogEntry({ abilityId: 'stun', abilityName: 'Stun' })
  const lines = resultLines(entry)
  assertEq(lines, ['Aturdido: saltea turno'], 'stun entry returns single stun line')
}

// Single damage hit
{
  const entry = makeLogEntry({
    results: [{ targetId: 'd1', targetName: 'Rival', blocked: false, damage: 35, died: false }],
  })
  const lines = resultLines(entry)
  assert(lines.length >= 1, 'damage entry produces at least 1 line')
  assert(lines[0].includes('35 daño'), 'damage line contains dmg value')
  assert(!lines[0].includes('💀'), 'no skull when not died')
}

// Lethal hit
{
  const entry = makeLogEntry({
    results: [{ targetId: 'd1', targetName: 'Rival', blocked: false, damage: 150, died: true }],
  })
  const lines = resultLines(entry)
  assert(lines[0].includes('💀'), 'lethal hit includes 💀')
  assert(lines[0].includes('150 daño'), 'lethal hit includes damage value')
}

// Blocked hit
{
  const entry = makeLogEntry({
    results: [{ targetId: 'd1', targetName: 'Rival', blocked: true, damage: 20, died: false }],
  })
  const lines = resultLines(entry)
  assert(lines[0].includes('Bloqueado'), 'blocked hit shows Bloqueado')
  assert(lines[0].includes('20'), 'blocked hit shows original damage')
}

// Heal
{
  const entry = makeLogEntry({
    abilityId: 'for_regen',
    results: [{ targetId: 'a1', targetName: 'Lobo', blocked: false, heal: 22, died: false }],
  })
  const lines = resultLines(entry)
  assert(lines[0].includes('+22 HP'), 'heal shows +22 HP')
}

// Stun effect result
{
  const entry = makeLogEntry({
    abilityId: 'ele_rayo',
    results: [{ targetId: 'd1', targetName: 'Rival', blocked: false, damage: 18, stun: 1, died: false }],
  })
  const lines = resultLines(entry)
  // damage line is first (damage !== undefined takes priority in map)
  assert(lines.some(l => l.includes('18 daño')), 'stun+damage entry has damage line')
}

// Effect text (debuff description)
{
  const entry = makeLogEntry({
    abilityId: 'for_enred',
    results: [{ targetId: 'd1', targetName: 'Rival', blocked: false, effect: 'Agility reducida 25%', died: false }],
  })
  const lines = resultLines(entry)
  assert(lines[0].includes('Agility reducida 25%'), 'effect text passed through')
}

// Multi-target — should include total line
{
  const entry = makeLogEntry({
    abilityId: 'vol_golpe',
    targetIds: ['d1', 'd2', 'd3'],
    results: [
      { targetId: 'd1', targetName: null, blocked: false, damage: 20, died: false },
      { targetId: 'd2', targetName: null, blocked: false, damage: 20, died: false },
      { targetId: 'd3', targetName: null, blocked: false, damage: 20, died: false },
    ],
  })
  const lines = resultLines(entry)
  assert(lines.some(l => l.includes('Total: 60 daño')), 'multi-target shows total damage summary')
}

// Multi-target with some blocked
{
  const entry = makeLogEntry({
    abilityId: 'acu_burbuja',
    targetIds: ['d1', 'd2'],
    results: [
      { targetId: 'd1', targetName: null, blocked: false, damage: 15, died: false },
      { targetId: 'd2', targetName: null, blocked: true,  damage: 6,  died: false },
    ],
  })
  const lines = resultLines(entry)
  // 15 + 6 = 21, but blocked damage still counts in total
  assert(lines.some(l => l.includes('Total: 21 daño')), 'multi-target with block counts partial damage in total')
}

// Empty results array (passive trigger)
{
  const entry = makeLogEntry({ results: [] })
  const lines = resultLines(entry)
  assertEq(lines, [], 'empty results → empty lines (passive/no-op)')
}

// ─── Phase 3: Float number labels (derived from resultLines) ──────────────────

section('Phase 3 — Float number labels (via resultLines)')

// Damage → red number (positive integer, no prefix)
{
  const entry = makeLogEntry({
    results: [{ targetId: 'd1', targetName: null, blocked: false, damage: 42, died: false }],
  })
  const lines = resultLines(entry)
  // The float label in BattleField uses the raw damage value as string
  assert(lines[0] === '42 daño', 'damage result generates "42 daño" line (float label is the number)')
}

// Blocked → amber (✦ prefix in BattleField, Bloqueado in lines)
{
  const entry = makeLogEntry({
    results: [{ targetId: 'd1', targetName: null, blocked: true, damage: 12, died: false }],
  })
  const lines = resultLines(entry)
  assert(lines[0].startsWith('Bloqueado'), 'blocked generates Bloqueado line')
}

// Heal → green (+N HP)
{
  const entry = makeLogEntry({
    results: [{ targetId: 'a1', targetName: null, blocked: false, heal: 30, died: false }],
  })
  const lines = resultLines(entry)
  assert(lines[0] === '+30 HP', 'heal generates +30 HP line')
}

// ─── General: applySnapshot ───────────────────────────────────────────────────

section('General — applySnapshot()')

// HP and isDead applied correctly
{
  const base = makeBattleState()
  const snap = makeSnapshot({
    slots: [
      { therianId: 'a1', currentHp: 60, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'a2', currentHp: 0,  maxHp: 100, shieldHp: 0, isDead: true,  effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'd1', currentHp: 85, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
    turnIndex: 2,
    round: 2,
    status: 'active',
    winnerId: null,
  })

  const result = applySnapshot(base, snap)
  const a1 = result.slots.find(s => s.therianId === 'a1')!
  const a2 = result.slots.find(s => s.therianId === 'a2')!
  const d1 = result.slots.find(s => s.therianId === 'd1')!

  assertEq(a1.currentHp, 60,  'applySnapshot: a1 HP updated to 60')
  assertEq(a2.currentHp, 0,   'applySnapshot: a2 HP updated to 0')
  assertEq(a2.isDead,    true, 'applySnapshot: a2 isDead=true')
  assertEq(d1.currentHp, 85,  'applySnapshot: d1 HP updated to 85')
  assertEq(result.turnIndex, 2, 'applySnapshot: turnIndex updated to 2')
  assertEq(result.round,     2, 'applySnapshot: round updated to 2')
}

// Completed status and winnerId applied
{
  const base = makeBattleState()
  const snap = makeSnapshot({
    status: 'completed',
    winnerId: 'user-attacker',
  })
  const result = applySnapshot(base, snap)
  assertEq(result.status,   'completed',      'applySnapshot: status completed applied')
  assertEq(result.winnerId, 'user-attacker',  'applySnapshot: winnerId applied')
}

// Unknown therianId in snapshot → slot unchanged
{
  const base = makeBattleState()
  const originalHp = base.slots[0].currentHp // 80
  const snap = makeSnapshot({
    slots: [
      // Only d1 in snap, a1/a2 are NOT present
      { therianId: 'd1', currentHp: 50, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
  })
  const result = applySnapshot(base, snap)
  const a1 = result.slots.find(s => s.therianId === 'a1')!
  assertEq(a1.currentHp, originalHp, 'applySnapshot: slot with no matching snapshot is unchanged')
}

// Effects applied from snapshot
{
  const base = makeBattleState()
  const stunEffect = { type: 'stun' as const, value: 1, turnsRemaining: 1 }
  const snap = makeSnapshot({
    slots: [
      { therianId: 'a1', currentHp: 80, maxHp: 100, shieldHp: 0, isDead: false, effects: [stunEffect], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'a2', currentHp: 50, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'd1', currentHp: 100, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
  })
  const result = applySnapshot(base, snap)
  const a1 = result.slots.find(s => s.therianId === 'a1')!
  assert(a1.effects.length === 1,         'applySnapshot: effects array applied')
  assertEq(a1.effects[0].type, 'stun',    'applySnapshot: stun effect applied correctly')
}

// Cooldowns applied
{
  const base = makeBattleState()
  const snap = makeSnapshot({
    slots: [
      { therianId: 'a1', currentHp: 80, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: { for_regen: 3 }, effectiveAgility: 20 },
      { therianId: 'a2', currentHp: 50, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'd1', currentHp: 100, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
  })
  const result = applySnapshot(base, snap)
  const a1 = result.slots.find(s => s.therianId === 'a1')!
  assertEq(a1.cooldowns['for_regen'], 3, 'applySnapshot: cooldowns applied')
}

// effectiveAgility updated (important for speed buffs/debuffs)
{
  const base = makeBattleState()
  const snap = makeSnapshot({
    slots: [
      { therianId: 'a1', currentHp: 80, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 28 }, // buffed
      { therianId: 'a2', currentHp: 50, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'd1', currentHp: 100, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
  })
  const result = applySnapshot(base, snap)
  const a1 = result.slots.find(s => s.therianId === 'a1')!
  assertEq(a1.effectiveAgility, 28, 'applySnapshot: effectiveAgility updated (buff applied)')
}

// Immutable: original base not mutated
{
  const base = makeBattleState()
  const originalHp = base.slots[0].currentHp
  const snap = makeSnapshot({
    slots: [
      { therianId: 'a1', currentHp: 10, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'a2', currentHp: 50, maxHp: 100, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 20 },
      { therianId: 'd1', currentHp: 100, maxHp: 120, shieldHp: 0, isDead: false, effects: [], cooldowns: {}, effectiveAgility: 18 },
    ],
  })
  applySnapshot(base, snap)
  assertEq(base.slots[0].currentHp, originalHp, 'applySnapshot: original base state not mutated')
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Battlefield UI Tests: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error(`\n⚠️  ${failed} test(s) failed`)
  process.exit(1)
} else {
  console.log('\n✅ All tests passed!')
}
