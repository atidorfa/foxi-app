/**
 * Test manual del motor PvP.
 * Ejecutar con: npx ts-node --skip-project lib/pvp/__test__/engine.test.ts
 */
import { initBattleState, resolveTurn, getActiveSlot, isPlayerTurn } from '../engine'
import { aiDecide } from '../ai'
import type { InitTeamMember } from '../engine'
import type { BattleState } from '../types'

// ─── Datos ficticios ──────────────────────────────────────────────────────────

const attackerTeam: InitTeamMember[] = [
  {
    therianId: 'atk-1',
    name: 'Ember',
    archetype: 'volcanico',
    vitality: 70, agility: 60, instinct: 40, charisma: 80,
    equippedAbilities: ['vol_erup', 'vol_intim', 'vol_aura'],
  },
  {
    therianId: 'atk-2',
    name: 'Spark',
    archetype: 'electrico',
    vitality: 55, agility: 95, instinct: 50, charisma: 45,
    equippedAbilities: ['ele_rayo', 'ele_sobre', 'ele_cond'],
  },
  {
    therianId: 'atk-3',
    name: 'Fern',
    archetype: 'forestal',
    vitality: 80, agility: 50, instinct: 70, charisma: 60,
    equippedAbilities: ['for_regen', 'for_enred', 'for_espinas'],
  },
]

const defenderTeam: InitTeamMember[] = [
  {
    therianId: 'def-1',
    name: 'Tide',
    archetype: 'acuatico',
    vitality: 75, agility: 65, instinct: 60, charisma: 55,
    equippedAbilities: ['acu_marea', 'acu_tsun', 'acu_fluid'],
  },
  {
    therianId: 'def-2',
    name: 'Blaze',
    archetype: 'volcanico',
    vitality: 65, agility: 70, instinct: 45, charisma: 50,
    equippedAbilities: ['vol_erup', 'vol_intim'],
  },
  {
    therianId: 'def-3',
    name: 'Grove',
    archetype: 'forestal',
    vitality: 85, agility: 45, instinct: 65, charisma: 40,
    equippedAbilities: ['for_regen', 'for_espinas'],
  },
]

// ─── RNG determinista para tests ──────────────────────────────────────────────
let seed = 12345
function rng(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0xFFFFFFFF
}

// ─── Simular batalla completa ─────────────────────────────────────────────────
function runBattle() {
  let state: BattleState = initBattleState(attackerTeam, defenderTeam)

  console.log('=== INICIO DE BATALLA ===')
  console.log(`Turno inicial: ${getActiveSlot(state).name} (${getActiveSlot(state).side})`)
  console.log(`Auras:`, state.auras.map(a => `${a.side}→${a.type}(${a.value.toFixed(1)})`))
  console.log('')

  // Mostrar HP iniciales
  for (const slot of state.slots) {
    console.log(`  ${slot.name} [${slot.archetype}] HP:${slot.currentHp}/${slot.maxHp} AGI:${slot.effectiveAgility}`)
  }
  console.log('')

  let turnCount = 0
  const MAX_TURNS = 100  // guardia anti-loop infinito

  while (state.status === 'active' && turnCount < MAX_TURNS) {
    const actor = getActiveSlot(state)

    let input: { abilityId: string; targetId?: string }

    if (isPlayerTurn(state)) {
      // Jugador: usar básico innato contra el primer enemigo vivo
      const enemies = state.slots.filter(s => s.side === 'defender' && !s.isDead)
      input = { abilityId: actor.innateAbilityId, targetId: enemies[0]?.therianId }
    } else {
      // IA decide
      const allies  = state.slots.filter(s => s.side === 'defender')
      const enemies = state.slots.filter(s => s.side === 'attacker')
      const aiAction = aiDecide(actor, allies, enemies)
      input = aiAction
    }

    const { entry } = resolveTurn(state, input, rng)

    // Log resumido
    const results = entry.results.map(r => {
      const parts = []
      if (r.damage !== undefined) parts.push(`-${r.damage}HP${r.blocked ? '(bloq)' : ''}`)
      if (r.heal   !== undefined) parts.push(`+${r.heal}HP`)
      if (r.stun   !== undefined) parts.push(`stun`)
      if (r.effect !== undefined) parts.push(r.effect)
      if (r.died)                 parts.push(`MUERTO`)
      return `${r.targetName}: ${parts.join(', ')}`
    }).join(' | ')

    console.log(`T${turnCount + 1} [R${entry.turn}] ${entry.actorName} usa ${entry.abilityName} → ${results || '(sin efecto)'}`)

    turnCount++
  }

  console.log('')
  console.log('=== RESULTADO ===')
  console.log(`Estado: ${state.status}`)
  console.log(`Ganador: ${state.winnerId ?? 'defensor'}`)
  console.log(`Turnos totales: ${turnCount}`)
  console.log('')

  // HP finales
  for (const slot of state.slots) {
    console.log(`  ${slot.name} [${slot.archetype}] HP:${slot.currentHp}/${slot.maxHp} ${slot.isDead ? '💀' : '✓'}`)
  }

  // Verificaciones
  console.log('\n=== VERIFICACIONES ===')
  console.log(`✓ Batalla terminó correctamente: ${state.status === 'completed'}`)
  console.log(`✓ Log tiene entradas: ${state.log.length > 0}`)
  const deadCount = state.slots.filter(s => s.isDead).length
  console.log(`✓ Al menos 3 Therians murieron: ${deadCount >= 3}`)
  const oneSideDead =
    state.slots.filter(s => s.side === 'attacker' && s.isDead).length === 3 ||
    state.slots.filter(s => s.side === 'defender' && s.isDead).length === 3
  console.log(`✓ Un equipo completo muerto: ${oneSideDead}`)
}

runBattle()
