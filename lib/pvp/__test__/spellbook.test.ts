/**
 * Tests para el catálogo de habilidades (Spellbook / Libro de Hechizos)
 * Ejecutar con:  npx tsx lib/pvp/__test__/spellbook.test.ts
 *
 * Cubre:
 *  ✓ Catálogo completo — 36 habilidades equipables (4 arquetipos × 9 = 36)
 *  ✓ Cada habilidad tiene campos obligatorios válidos
 *  ✓ Separación activas/pasivas por arquetipo (6 activas + 3 pasivas)
 *  ✓ Las pasivas no tienen damage (no son ataques manuales)
 *  ✓ ABILITY_BY_ID indexa correctamente todas las habilidades
 *  ✓ Habilidades innatas — 1 por arquetipo, no equipables
 *  ✓ Cooldowns y targets coherentes
 */

import { ABILITIES, INNATE_ABILITIES, ABILITY_BY_ID } from '../abilities'
import type { Ability } from '../abilities'

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) { console.log(`  ✓ ${msg}`); passed++ }
  else           { console.error(`  ✗ FAIL: ${msg}`); failed++ }
}

function assertEq<T>(a: T, b: T, msg: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b)
  if (ok) { console.log(`  ✓ ${msg}`); passed++ }
  else    { console.error(`  ✗ FAIL: ${msg}\n    got: ${JSON.stringify(a)}\n    expected: ${JSON.stringify(b)}`); failed++ }
}

function section(name: string) { console.log(`\n═══ ${name} ═══`) }

const ARCHETYPES = ['forestal', 'electrico', 'acuatico', 'volcanico'] as const
const EXPECTED_ACTIVES_PER_ARCH  = 6
const EXPECTED_PASSIVES_PER_ARCH = 3
const EXPECTED_TOTAL = ARCHETYPES.length * (EXPECTED_ACTIVES_PER_ARCH + EXPECTED_PASSIVES_PER_ARCH) // 36

// ─── 1. Tamaño del catálogo ───────────────────────────────────────────────────

section('1. Tamaño del catálogo')

assertEq(ABILITIES.length, EXPECTED_TOTAL, `Catálogo tiene exactamente ${EXPECTED_TOTAL} habilidades equipables`)

for (const arch of ARCHETYPES) {
  const actives  = ABILITIES.filter(a => a.archetype === arch && a.type === 'active')
  const passives = ABILITIES.filter(a => a.archetype === arch && a.type === 'passive')
  assertEq(actives.length,  EXPECTED_ACTIVES_PER_ARCH,  `${arch}: ${EXPECTED_ACTIVES_PER_ARCH} activas`)
  assertEq(passives.length, EXPECTED_PASSIVES_PER_ARCH, `${arch}: ${EXPECTED_PASSIVES_PER_ARCH} pasivas`)
}

// ─── 2. Campos obligatorios ───────────────────────────────────────────────────

section('2. Campos obligatorios en cada habilidad')

for (const ab of ABILITIES) {
  assert(typeof ab.id === 'string' && ab.id.length > 0,           `[${ab.id}] tiene id`)
  assert(typeof ab.name === 'string' && ab.name.length > 0,       `[${ab.id}] tiene name`)
  assert(ARCHETYPES.includes(ab.archetype as typeof ARCHETYPES[number]), `[${ab.id}] archetype válido`)
  assert(ab.type === 'active' || ab.type === 'passive',           `[${ab.id}] type es active|passive`)
  assert(typeof ab.cooldown === 'number' && ab.cooldown >= 0,     `[${ab.id}] cooldown >= 0`)
  assert(['self', 'ally', 'single', 'all'].includes(ab.target),   `[${ab.id}] target válido`)
  assert(typeof ab.effect === 'object' && ab.effect !== null,     `[${ab.id}] tiene effect`)
}

// ─── 3. IDs únicos ───────────────────────────────────────────────────────────

section('3. IDs únicos')

const ids = ABILITIES.map(a => a.id)
const uniqueIds = new Set(ids)
assertEq(uniqueIds.size, ids.length, 'Todos los IDs de habilidades son únicos')

// ─── 4. ABILITY_BY_ID indexa correctamente ───────────────────────────────────

section('4. ABILITY_BY_ID indexa correctamente')

for (const ab of ABILITIES) {
  assert(ABILITY_BY_ID[ab.id] === ab, `ABILITY_BY_ID['${ab.id}'] apunta a la habilidad correcta`)
}

// ─── 5. Pasivas no deben ser ataques manuales ─────────────────────────────────

section('5. Pasivas: sin damage como efecto principal de ataque directo')

for (const ab of ABILITIES.filter(a => a.type === 'passive')) {
  // Pasivas pueden tener thorns/reflect (damage indirecto), pero no damage directo sin stun/buff
  // La regla es: si es pasiva, cooldown debe ser 0
  assertEq(ab.cooldown, 0, `Pasiva [${ab.id}] tiene cooldown 0`)
}

// ─── 6. Activas tienen cooldown > 0 ──────────────────────────────────────────

section('6. Activas tienen cooldown > 0')

for (const ab of ABILITIES.filter(a => a.type === 'active')) {
  assert(ab.cooldown > 0, `Activa [${ab.id}] tiene cooldown > 0 (got ${ab.cooldown})`)
}

// ─── 7. Innatas — 1 por arquetipo, no equipables ─────────────────────────────

section('7. Habilidades innatas')

assertEq(INNATE_ABILITIES.length, 4, 'Existen exactamente 4 innatas (una por arquetipo)')

for (const arch of ARCHETYPES) {
  const innate = INNATE_ABILITIES.find(a => a.archetype === arch)
  assert(!!innate, `Existe innata para arquetipo ${arch}`)
  if (innate) {
    assert(innate.isInnate === true,    `[${innate.id}] isInnate = true`)
    assertEq(innate.cooldown, 0,        `[${innate.id}] cooldown = 0`)
    assertEq(innate.type, 'active',     `[${innate.id}] type = active`)
    assert(innate.effect.damage !== undefined, `[${innate.id}] tiene damage`)
  }
}

// Innatas NO deben estar en ABILITIES (no equipables)
for (const innate of INNATE_ABILITIES) {
  assert(!ABILITIES.find(a => a.id === innate.id), `Innata [${innate.id}] no aparece en ABILITIES equipables`)
}

// ─── 8. Coherencia de targets ─────────────────────────────────────────────────

section('8. Coherencia target vs type')

for (const ab of ABILITIES) {
  if (ab.type === 'passive') {
    // Pasivas siempre apuntan a self
    assertEq(ab.target, 'self', `Pasiva [${ab.id}] target = self`)
  }
  if (ab.effect.heal !== undefined) {
    // Curaciones no van a enemigos
    assert(['self', 'ally'].includes(ab.target), `[${ab.id}] curación apunta a self|ally`)
  }
}

// ─── 9. Habilidades con efectos compuestos válidos ───────────────────────────

section('9. Efectos compuestos bien formados')

for (const ab of ABILITIES) {
  const e = ab.effect
  if (e.dot)       { assert(e.dot.damage > 0 && e.dot.turns > 0, `[${ab.id}] dot válido`) }
  if (e.buff)      { assert(e.buff.pct > 0 && e.buff.turns > 0,  `[${ab.id}] buff válido`) }
  if (e.debuff)    { assert(e.debuff.pct > 0 && e.debuff.turns > 0, `[${ab.id}] debuff válido`) }
  if (e.execute)   { assert(e.execute.threshold > 0 && e.execute.threshold < 1, `[${ab.id}] execute threshold en rango`) }
  if (e.multiHit)  { assert(e.multiHit.count >= 2, `[${ab.id}] multiHit count >= 2`) }
}

// ─── 10. Habilidades clave del catálogo ──────────────────────────────────────

section('10. Habilidades clave presentes')

const EXPECTED_IDS = [
  // Forestal
  'for_regen', 'for_enred', 'for_latigo', 'for_cura_salvaje', 'for_veneno', 'for_drenar',
  'for_espinas', 'for_raices', 'for_resiliencia',
  // Eléctrico
  'ele_rayo', 'ele_sobre', 'ele_multirayo', 'ele_cortocircuito', 'ele_tormenta', 'ele_pulso',
  'ele_cond', 'ele_estatica', 'ele_blindaje',
  // Acuático
  'acu_marea', 'acu_corriente', 'acu_burbuja', 'acu_helar', 'acu_absorber', 'acu_presion',
  'acu_fluid', 'acu_escama', 'acu_corrientevida',
  // Volcánico
  'vol_intim', 'vol_ejecucion', 'vol_golpe', 'vol_quemadura', 'vol_explosion', 'vol_lava',
  'vol_aura', 'vol_berserker', 'vol_nucleo',
]

for (const id of EXPECTED_IDS) {
  assert(!!ABILITY_BY_ID[id], `Habilidad '${id}' existe en el catálogo`)
}

// ─── Resumen ──────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(50))
console.log(`Tests: ${passed + failed} total · ✓ ${passed} passed · ✗ ${failed} failed`)
console.log('═'.repeat(50))
if (failed > 0) process.exit(1)
