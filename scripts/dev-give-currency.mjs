/**
 * Dev script: dale currency a un usuario para testing.
 * Uso: node scripts/dev-give-currency.mjs <email> [essencia] [therianCoin]
 * Ejemplo: node scripts/dev-give-currency.mjs test@test.com 5000 10
 */
import { PrismaClient } from '@prisma/client'

const [, , email, essencia = '5000', therianCoin = '10'] = process.argv

if (!email) {
  console.error('Uso: node scripts/dev-give-currency.mjs <email> [essencia] [therianCoin]')
  process.exit(1)
}

const db = new PrismaClient()

try {
  const user = await db.user.update({
    where: { email },
    data: {
      essencia: parseInt(essencia),
      therianCoin: parseInt(therianCoin),
    },
    select: { email: true, essencia: true, therianCoin: true, therianSlots: true },
  })
  console.log('✅ Balance actualizado:')
  console.log(`   Email:       ${user.email}`)
  console.log(`   Essencia:    ${user.essencia}`)
  console.log(`   TherianCoin: ${user.therianCoin}`)
  console.log(`   Slots:       ${user.therianSlots}`)
} catch (e) {
  console.error('❌ Error:', e.message)
} finally {
  await db.$disconnect()
}
