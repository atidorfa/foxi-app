import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import type { BattleState } from '@/lib/pvp/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const battle = await db.pvpBattle.findFirst({
    where: { id, attackerId: session.user.id },
  })
  if (!battle) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const state: BattleState = JSON.parse(battle.state)
  return NextResponse.json({ battleId: battle.id, status: battle.status, state })
}
