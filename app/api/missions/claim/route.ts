import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { MISSIONS, getMissionClaimKey, getDayKey, getWeekKey, type MissionProgress } from '@/lib/catalogs/missions'
import { xpToNextLevel } from '@/lib/therian-dto'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { missionId } = await req.json()
  const mission = MISSIONS.find((m) => m.id === missionId)
  if (!mission) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dba = db as any
  const now = new Date()
  const todayKey = getDayKey(now)
  const yesterdayKey = getDayKey(new Date(now.getTime() - 86_400_000))

  const user = await dba.user.findUnique({
    where: { id: session.user.id },
    select: {
      loginStreak: true,
      lastLoginDate: true,
      claimedMissions: true,
      xp: true,
      level: true,
      therians: { select: { id: true } },
    },
  }) as {
    loginStreak: number
    lastLoginDate: string
    claimedMissions: string
    xp: number
    level: number
    therians: Array<{ id: string }>
  } | null

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const claimKey = getMissionClaimKey(mission, now)
  const claimed: string[] = JSON.parse(user.claimedMissions || '[]')
  if (claimed.includes(claimKey)) {
    return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 409 })
  }

  // Resolve login streak (same logic as GET)
  let { loginStreak } = user
  if (user.lastLoginDate !== todayKey) {
    loginStreak = user.lastLoginDate === yesterdayKey ? loginStreak + 1 : 1
  }

  const therianIds = user.therians.map((t) => t.id)
  const dayStart  = new Date(todayKey + 'T00:00:00.000Z')
  const weekStart = new Date(now)
  const dow = weekStart.getUTCDay()
  weekStart.setUTCDate(weekStart.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  weekStart.setUTCHours(0, 0, 0, 0)

  const [actionsToday, actionsThisWeek, bitesToday, bitesThisWeek] = therianIds.length
    ? await Promise.all([
        db.actionLog.count({ where: { therianId: { in: therianIds }, createdAt: { gte: dayStart } } }),
        db.actionLog.count({ where: { therianId: { in: therianIds }, createdAt: { gte: weekStart } } }),
        dba.battleLog.count({ where: { challengerId: { in: therianIds }, createdAt: { gte: dayStart } } }),
        dba.battleLog.count({ where: { challengerId: { in: therianIds }, createdAt: { gte: weekStart } } }),
      ])
    : [0, 0, 0, 0]

  const progress: MissionProgress = { actionsToday, bitesToday, actionsThisWeek, bitesThisWeek, loginStreak }

  if (mission.getProgress(progress) < mission.goal) {
    return NextResponse.json({ error: 'NOT_COMPLETED' }, { status: 400 })
  }

  claimed.push(claimKey)
  const updateData: Record<string, unknown> = { claimedMissions: JSON.stringify(claimed) }
  if (mission.reward.gold) updateData.gold = { increment: mission.reward.gold }
  if (mission.reward.xp) {
    let newXp = (user.xp ?? 0) + mission.reward.xp
    let newLevel = user.level ?? 1
    if (newXp >= xpToNextLevel(newLevel)) {
      newXp -= xpToNextLevel(newLevel)
      newLevel += 1
    }
    updateData.xp = newXp
    updateData.level = newLevel
  }

  await dba.user.update({ where: { id: session.user.id }, data: updateData })

  return NextResponse.json({ success: true, reward: mission.reward })
}
