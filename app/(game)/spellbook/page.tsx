import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import SpellbookPage from '@/components/spellbook/SpellbookPage'

export const metadata = { title: 'Libro de Hechizos — Therian' }

export default async function SpellbookRoute() {
  const session = await getSession()
  if (!session?.user?.id) redirect('/login')

  return <SpellbookPage />
}
