import type { TurnSlot, AIAction, Archetype, BattleState } from './types'
import { getTypeMultiplier } from './types'
import { ABILITY_BY_ID, ABILITIES } from './abilities'

/**
 * IA media: prioriza ventaja elemental, cura si HP bajo,
 * elige la mejor habilidad ofensiva disponible.
 */
export function aiDecide(
  actor: TurnSlot,
  allies: TurnSlot[],
  enemies: TurnSlot[],
): AIAction {
  const aliveEnemies = enemies.filter(e => !e.isDead)
  const aliveAllies  = allies.filter(a => !a.isDead)

  // 1. Si HP < 30% y tiene habilidad de curación disponible → curar
  if (actor.currentHp / actor.maxHp < 0.30) {
    const cure = findCureAbility(actor)
    if (cure) {
      // Marea Curativa puede curar a un aliado dañado
      if (cure.target === 'ally') {
        const wounded = aliveAllies.filter(a => a.therianId !== actor.therianId)
          .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0]
        return { abilityId: cure.id, targetId: wounded?.therianId ?? actor.therianId }
      }
      return { abilityId: cure.id }
    }
  }

  // 2. Buscar enemigo con ventaja elemental
  const priorityTarget = aliveEnemies.find(
    e => getTypeMultiplier(actor.archetype as Archetype, e.archetype as Archetype) > 1.0
  ) ?? aliveEnemies[0]

  if (!priorityTarget) return { abilityId: actor.innateAbilityId }

  // 3. Usar la mejor habilidad ofensiva disponible (no en cooldown, no pasiva)
  const best = bestOffensiveAbility(actor)
  return { abilityId: best, targetId: best === actor.innateAbilityId ? priorityTarget.therianId : priorityTarget.therianId }
}

/**
 * Decide si la IA debe cambiar el frontliner activo de `side` por desventaja de tipo.
 * Solo cambia si hay un miembro de banco con ventaja elemental sobre el rival.
 * Devuelve el therianId a cambiar, o null si no se debe cambiar.
 */
export function aiDecideSwitch(
  state: BattleState,
  side: 'attacker' | 'defender',
): string | null {
  if (!state.frontliner) return null

  const myFrontierId    = state.frontliner[side]
  const enemySide       = side === 'attacker' ? 'defender' : 'attacker'
  const enemyFrontierId = state.frontliner[enemySide]

  const myFrontliner    = state.slots.find(s => s.therianId === myFrontierId && !s.isDead)
  const enemyFrontliner = state.slots.find(s => s.therianId === enemyFrontierId && !s.isDead)

  if (!myFrontliner || !enemyFrontliner) return null

  // Switch when bench has type advantage AND current frontliner doesn't already have advantage
  const myMult = getTypeMultiplier(myFrontliner.archetype, enemyFrontliner.archetype)
  if (myMult > 1.0) return null  // already winning the type matchup, stay

  // Look for a bench slot with type advantage over the enemy
  const bench = state.slots.filter(
    s => s.side === side && !s.isDead && s.therianId !== myFrontierId
  )
  if (bench.length === 0) return null

  const better = bench.find(
    b => getTypeMultiplier(b.archetype, enemyFrontliner.archetype) > 1.0
  )
  // Return the advantageous slot, or null if no better option available
  return better?.therianId ?? null
}

function findCureAbility(actor: TurnSlot) {
  const candidates = [...actor.equippedAbilities]
  for (const id of candidates) {
    const ab = ABILITY_BY_ID[id]
    if (!ab) continue
    if (ab.type !== 'active') continue
    if (!ab.effect.heal) continue
    if ((actor.cooldowns[id] ?? 0) > 0) continue
    return ab
  }
  return null
}

function bestOffensiveAbility(actor: TurnSlot): string {
  let bestId   = actor.innateAbilityId
  let bestDmg  = 1.0

  for (const id of actor.equippedAbilities) {
    const ab = ABILITY_BY_ID[id]
    if (!ab) continue
    if (ab.type !== 'active') continue
    if ((actor.cooldowns[id] ?? 0) > 0) continue
    if (!ab.effect.damage) continue
    if (ab.effect.damage > bestDmg) {
      bestDmg = ab.effect.damage
      bestId  = id
    }
  }

  // Si Rayo Paralizante disponible y no tiene stun activo en ningún enemigo → preferirlo
  if (
    actor.equippedAbilities.includes('ele_rayo') &&
    (actor.cooldowns['ele_rayo'] ?? 0) === 0
  ) {
    return 'ele_rayo'
  }

  return bestId
}
