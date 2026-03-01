export const ENERGY_MAX = 10
export const ENERGY_REGEN_MS = 160 * 60 * 1000 // 160 minutos

export function computeEnergy(
  pvpEnergy: number,
  pvpEnergyRegenAt: Date | null,
): { energy: number; regenAt: Date | null; dirty: boolean } {
  if (pvpEnergy >= ENERGY_MAX || !pvpEnergyRegenAt) {
    return { energy: Math.min(pvpEnergy, ENERGY_MAX), regenAt: null, dirty: false }
  }

  const now = Date.now()
  let energy = pvpEnergy
  let regenAt: Date | null = pvpEnergyRegenAt
  let dirty = false

  while (regenAt && regenAt.getTime() <= now && energy < ENERGY_MAX) {
    energy += 1
    dirty = true
    if (energy >= ENERGY_MAX) {
      regenAt = null
      break
    }
    regenAt = new Date(regenAt.getTime() + ENERGY_REGEN_MS)
  }

  return { energy, regenAt, dirty }
}

export function spendEnergy(
  pvpEnergy: number,
  pvpEnergyRegenAt: Date | null,
): { energy: number; regenAt: Date } {
  if (pvpEnergy <= 0) throw new Error('NO_ENERGY')
  const newEnergy = pvpEnergy - 1
  const newRegenAt = pvpEnergyRegenAt ?? new Date(Date.now() + ENERGY_REGEN_MS)
  return { energy: newEnergy, regenAt: newRegenAt }
}
