import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify?error=missing_token', req.url))
  }

  const record = await db.verificationToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.redirect(new URL('/verify?error=invalid_token', req.url))
  }

  if (record.expiresAt < new Date()) {
    await db.verificationToken.delete({ where: { id: record.id } })
    return NextResponse.redirect(new URL('/verify?error=expired_token', req.url))
  }

  // Mark email as verified and delete token atomically
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.delete({ where: { id: record.id } }),
  ])

  return NextResponse.redirect(new URL('/login?verified=1', req.url))
}
