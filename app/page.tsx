import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export default async function HomePage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const therian = await db.therian.findFirst({
    where: { userId: session.user.id },
  })

  if (!therian) {
    redirect('/adopt')
  }

  redirect('/therian')
}
