import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { ACHIEVEMENTS } from '@/lib/catalogs/achievements'
import { xpToNextLevel } from '@/lib/therian-dto'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { achievementId } = await req.json()

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!achievement) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const user = await dba.user.findUnique({
    where: { id: session.user.id },
    select: {
      level: true,
      xp: true,
      therianSlots: true,
      claimedAchievements: true,
      therians: { select: { actionGains: true } },
    },
  }) as { level: number; xp: number; therianSlots: number; claimedAchievements: string; therians: Array<{ actionGains: string }> } | null

  if (!user) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const claimed: string[] = JSON.parse(user.claimedAchievements || '[]')

  if (claimed.includes(achievementId)) {
    return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 409 })
  }

  if (!achievement.check({ level: user.level, therianSlots: user.therianSlots, therians: user.therians })) {
    return NextResponse.json({ error: 'NOT_UNLOCKED' }, { status: 400 })
  }

  claimed.push(achievementId)

  const updateData: Record<string, unknown> = {
    claimedAchievements: JSON.stringify(claimed),
  }
  if (achievement.reward.therianSlots) {
    updateData.therianSlots = { increment: achievement.reward.therianSlots }
  }
  if (achievement.reward.gold) {
    updateData.gold = { increment: achievement.reward.gold }
  }
  if (achievement.reward.xp) {
    let newXp = (user.xp ?? 0) + achievement.reward.xp
    let newLevel = user.level ?? 1
    if (newXp >= xpToNextLevel(newLevel)) {
      newXp -= xpToNextLevel(newLevel)
      newLevel += 1
    }
    updateData.xp = newXp
    updateData.level = newLevel
  }

  await dba.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  return NextResponse.json({ success: true, reward: achievement.reward })
}
