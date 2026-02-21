'use client'

import type { TherianDTO } from '@/lib/therian-dto'
import TherianCard from './TherianCard'

interface Props {
  therian: TherianDTO
  rank?: number
}

export default function RuneSystem({ therian, rank }: Props) {
  return (
    <div className="w-full max-w-sm mx-auto">
      <TherianCard therian={therian} rank={rank} />
    </div>
  )
}
