import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { toTherianDTO } from '@/lib/therian-dto'
import CasaRoom from '@/components/CasaRoom'

export const dynamic = 'force-dynamic'

export default async function CasaPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const therian = await db.therian.findUnique({
    where: { userId: session.user.id },
  })

  if (!therian) {
    redirect('/adopt')
  }

  const dto = toTherianDTO(therian)

  // La Casa solo está disponible para Therians evolucionados (nivel 2+)
  if (dto.level < 2) {
    redirect('/therian')
  }

  return <CasaRoom therian={dto} />
}
