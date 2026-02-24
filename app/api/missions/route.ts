import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { MISSIONS, getMissionClaimKey, getDayKey, getWeekKey, type MissionProgress } from '@/lib/catalogs/missions'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

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
      therians: { select: { id: true } },
    },
  }) as {
    loginStreak: number
    lastLoginDate: string
    claimedMissions: string
    therians: Array<{ id: string }>
  } | null

  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  // Update login streak
  let { loginStreak, lastLoginDate } = user
  if (lastLoginDate !== todayKey) {
    loginStreak = lastLoginDate === yesterdayKey ? loginStreak + 1 : 1
    lastLoginDate = todayKey
    await dba.user.update({
      where: { id: session.user.id },
      data: { loginStreak, lastLoginDate },
    })
  }

  const therianIds = user.therians.map((t) => t.id)

  // Time boundaries (UTC)
  const dayStart = new Date(todayKey + 'T00:00:00.000Z')
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
  const claimed: string[] = JSON.parse(user.claimedMissions || '[]')

  const missions = MISSIONS.map((m) => {
    const claimKey  = getMissionClaimKey(m, now)
    const current   = m.getProgress(progress)
    return {
      id:          m.id,
      title:       m.title,
      description: m.description,
      rewardLabel: m.rewardLabel,
      type:        m.type,
      progress:    current,
      goal:        m.goal,
      completable: current >= m.goal && !claimed.includes(claimKey),
      claimed:     claimed.includes(claimKey),
    }
  })

  return NextResponse.json({ missions, loginStreak })
}
