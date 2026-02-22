import { createHmac } from 'crypto'
import seedrandom from 'seedrandom'

export interface BattleRound {
  attacker: 'challenger' | 'target'
  evaded: boolean
  critical: boolean
  blocked: boolean
  counterDamage: number
  damage: number
  challengerHp: number
  targetHp: number
}

export interface BattleResult {
  rounds: BattleRound[]
  winner: 'challenger' | 'target'
  challengerFinalHp: number
  targetFinalHp: number
}

export interface Combatant {
  id: string
  name: string
  stats: { vitality: number; agility: number; instinct: number; charisma: number }
  rarity: string
}

const RARITY_BONUS: Record<string, number> = {
  COMMON:    1.0,
  UNCOMMON:  1.05,
  RARE:      1.1,
  EPIC:      1.2,
  LEGENDARY: 1.35,
  MYTHIC:    1.5,
}

function getRarityBonus(rarity: string): number {
  return RARITY_BONUS[rarity] ?? 1.0
}

function resolveSubAttack(
  atk: Combatant,
  def: Combatant,
  attacker: 'challenger' | 'target',
  challengerHp: number,
  targetHp: number,
  rng: () => number,
  range: (min: number, max: number) => number,
): { round: BattleRound; challengerHp: number; targetHp: number } {
  // Evasion: agility / 350 → max ~28% at agility=100
  const evadeChance = def.stats.agility / 350
  const evaded = rng() < evadeChance

  // Critical: instinct / 250 → max ~40% at instinct=100
  const critChance = atk.stats.instinct / 250
  const critical = !evaded && rng() < critChance

  // Block: charisma / 400 → max ~25% at charisma=100
  // Cannot evade and block simultaneously — evasion takes priority
  const blockChance = def.stats.charisma / 400
  const blocked = !evaded && rng() < blockChance

  // Primary damage (0 if evaded or blocked)
  const baseDamage = 4 + range(1, 6) // 5–10
  const atkCharismaMod = 1 + (atk.stats.charisma - 50) / 200 // ±25%
  const rarityBonus = getRarityBonus(atk.rarity)
  const critMult = critical ? 2 : 1
  const damage = evaded || blocked
    ? 0
    : Math.round(baseDamage * atkCharismaMod * rarityBonus * critMult)

  // Counterattack on block: defender strikes back with ~50% force
  const defCharismaMod = 1 + (def.stats.charisma - 50) / 200
  const counterDamage = blocked
    ? Math.round((2 + range(1, 3)) * defCharismaMod * getRarityBonus(def.rarity))
    : 0

  // Apply damage: attacker hits defender, on block defender counters attacker
  if (attacker === 'challenger') {
    targetHp     = Math.max(0, targetHp - damage)
    challengerHp = Math.max(0, challengerHp - counterDamage)
  } else {
    challengerHp = Math.max(0, challengerHp - damage)
    targetHp     = Math.max(0, targetHp - counterDamage)
  }

  return {
    round: { attacker, evaded, critical, blocked, counterDamage, damage, challengerHp, targetHp },
    challengerHp,
    targetHp,
  }
}

export function calculateBattle(
  challenger: Combatant,
  target: Combatant,
  serverSecret: string,
  timestamp: number,
): BattleResult {
  // Deterministic seed per battle
  const seed = createHmac('sha256', serverSecret)
    .update(`battle:${challenger.id}:${target.id}:${timestamp}`)
    .digest('hex')

  const rng = seedrandom(seed)
  const range = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min

  let challengerHp = challenger.stats.vitality
  let targetHp     = target.stats.vitality

  const rounds: BattleRound[] = []
  // 20 full rounds = up to 40 sub-attacks (both combatants always act)
  const MAX_ROUNDS = 20

  // Initiative: higher agility attacks first within each round.
  // Ties go to challenger.
  const chalGoesFirst = challenger.stats.agility >= target.stats.agility
  const first:  'challenger' | 'target' = chalGoesFirst ? 'challenger' : 'target'
  const second: 'challenger' | 'target' = chalGoesFirst ? 'target'     : 'challenger'

  for (let r = 0; r < MAX_ROUNDS; r++) {
    if (challengerHp <= 0 || targetHp <= 0) break

    const firstAtk = first === 'challenger' ? challenger : target
    const firstDef = first === 'challenger' ? target     : challenger

    // Sub-attack 1: faster combatant attacks
    const sub1 = resolveSubAttack(firstAtk, firstDef, first, challengerHp, targetHp, rng, range)
    rounds.push(sub1.round)
    challengerHp = sub1.challengerHp
    targetHp     = sub1.targetHp

    if (challengerHp <= 0 || targetHp <= 0) break

    const secondAtk = second === 'challenger' ? challenger : target
    const secondDef = second === 'challenger' ? target     : challenger

    // Sub-attack 2: slower combatant attacks
    const sub2 = resolveSubAttack(secondAtk, secondDef, second, challengerHp, targetHp, rng, range)
    rounds.push(sub2.round)
    challengerHp = sub2.challengerHp
    targetHp     = sub2.targetHp
  }

  // Determine winner
  let winner: 'challenger' | 'target'
  if (challengerHp <= 0 && targetHp <= 0) {
    winner = 'challenger' // tie → challenger (home advantage)
  } else if (targetHp <= 0) {
    winner = 'challenger'
  } else if (challengerHp <= 0) {
    winner = 'target'
  } else {
    // Max rounds reached — higher remaining HP wins; tie → challenger
    winner = challengerHp >= targetHp ? 'challenger' : 'target'
  }

  return { rounds, winner, challengerFinalHp: challengerHp, targetFinalHp: targetHp }
}
