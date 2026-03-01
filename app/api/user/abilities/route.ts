import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const userId = session.user.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any

  const inventory = await dba.userAbilityInventory.findMany({
    where: { userId },
    orderBy: { obtainedAt: 'asc' },
  }) as { abilityId: string; quantity: number }[]

  const therians = await db.therian.findMany({
    where: { userId, status: 'active' },
    select: { id: true, name: true, equippedAbilities: true, equippedPassives: true },
  })

  const result = inventory.map(inv => {
    const equippedIn: string[] = []
    for (const t of therians) {
      const actives  = JSON.parse(t.equippedAbilities || '[]') as string[]
      const passives = JSON.parse(t.equippedPassives || '[]') as string[]
      if (actives.includes(inv.abilityId) || passives.includes(inv.abilityId)) {
        equippedIn.push(t.id)
      }
    }
    return { abilityId: inv.abilityId, quantity: inv.quantity, equippedIn }
  })

  return NextResponse.json({ inventory: result })
}
