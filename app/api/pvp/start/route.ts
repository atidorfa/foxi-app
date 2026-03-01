import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { initBattleState } from '@/lib/pvp/engine'
import type { InitTeamMember } from '@/lib/pvp/engine'
import { getPaletteById } from '@/lib/catalogs/appearance'

const schema = z.object({
  attackerTeamIds: z.array(z.string()).length(3),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const userId = session.user.id

  let body
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 }) }

  // Validar que los 3 Therians pertenecen al usuario y están activos
  const attackerTherians = await db.therian.findMany({
    where: { id: { in: body.attackerTeamIds }, userId, status: 'active' },
  })
  if (attackerTherians.length !== 3) {
    return NextResponse.json({ error: 'INVALID_TEAM' }, { status: 400 })
  }

  // Verificar que no haya batalla activa del usuario
  const existing = await db.pvpBattle.findFirst({
    where: { attackerId: userId, status: 'active' },
  })
  if (existing) {
    return NextResponse.json({ error: 'BATTLE_IN_PROGRESS', battleId: existing.id }, { status: 409 })
  }

  // Buscar oponente aleatorio (otro usuario con 3 Therians activos y con nombre)
  const opponents = await db.therian.findMany({
    where: {
      userId: { not: userId },
      status: 'active',
      name: { not: null },
    },
    select: { userId: true },
    distinct: ['userId'],
  })

  if (opponents.length === 0) {
    return NextResponse.json({ error: 'NO_OPPONENTS' }, { status: 404 })
  }

  // Elegir un oponente al azar que tenga al menos 3 Therians activos
  const shuffled = opponents.sort(() => Math.random() - 0.5)
  let defenderTherians = null
  for (const opp of shuffled) {
    const team = await db.therian.findMany({
      where: { userId: opp.userId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    })
    if (team.length >= 3) {
      defenderTherians = team.slice(0, 3)
      break
    }
  }

  if (!defenderTherians) {
    return NextResponse.json({ error: 'NO_OPPONENTS' }, { status: 404 })
  }

  const VALID_ARCHETYPES = ['forestal', 'electrico', 'acuatico', 'volcanico'] as const
  const LEGACY_ARCHETYPE_MAP: Record<string, InitTeamMember['archetype']> = {
    silent:      'forestal',
    mystic:      'forestal',
    guardian:    'acuatico',
    curious:     'acuatico',
    impulsive:   'electrico',
    feral:       'electrico',
    charismatic: 'volcanico',
    loyal:       'volcanico',
  }

  function resolveArchetype(traitId: string): InitTeamMember['archetype'] {
    if ((VALID_ARCHETYPES as readonly string[]).includes(traitId)) {
      return traitId as InitTeamMember['archetype']
    }
    return LEGACY_ARCHETYPE_MAP[traitId] ?? 'forestal'
  }

  function toMember(t: typeof attackerTherians[0]): InitTeamMember {
    const stats = JSON.parse(t.stats) as { vitality: number; agility: number; instinct: number; charisma: number }
    const appearance = JSON.parse(t.appearance) as { palette: string; eyes: string; pattern: string; signature: string }
    const palette = getPaletteById(appearance.palette)
    return {
      therianId:         t.id,
      name:              t.name,
      archetype:         resolveArchetype(t.traitId),
      vitality:          stats.vitality,
      agility:           stats.agility,
      instinct:          stats.instinct,
      charisma:          stats.charisma,
      auraId:            (t as any).auraId ?? null,
      equippedAbilities: JSON.parse(t.equippedAbilities || '[]') as string[],
      avatarSnapshot: {
        appearance: {
          palette:      appearance.palette,
          paletteColors: palette
            ? { primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
            : { primary: '#888', secondary: '#555', accent: '#aaa' },
          eyes:      appearance.eyes,
          pattern:   appearance.pattern,
          signature: appearance.signature,
        },
        level:  1,
        rarity: t.rarity,
      },
    }
  }

  const attackerMembers = attackerTherians.map(t => toMember(t))
  const defenderMembers = defenderTherians.map(t => toMember(t))

  let state
  try {
    state = initBattleState(attackerMembers, defenderMembers)
  } catch (err) {
    console.error('[pvp/start] Engine error:', err)
    return NextResponse.json({ error: 'ENGINE_ERROR', detail: String(err) }, { status: 500 })
  }

  // Persistir batalla con estado inicial (la resolución completa ocurre en /action)
  const battle = await db.pvpBattle.create({
    data: {
      attackerId:   userId,
      attackerTeam: JSON.stringify(body.attackerTeamIds),
      defenderTeam: JSON.stringify(defenderTherians.map(t => t.id)),
      state:        JSON.stringify(state),
      status:       'active',
    },
  })

  return NextResponse.json({ battleId: battle.id, state }, { status: 201 })
}
