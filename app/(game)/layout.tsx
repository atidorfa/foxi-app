import CurrencyDisplay from '@/components/CurrencyDisplay'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <header className="fixed top-0 right-0 z-40 p-3 pr-4">
        <CurrencyDisplay />
      </header>
      {children}
    </div>
  )
}
