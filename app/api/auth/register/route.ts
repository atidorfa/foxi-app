import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'
import { sendVerificationEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = schema.parse(body)

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'EMAIL_TAKEN' }, { status: 409 })
    }

    const hashed = await hash(password, 12)
    const user = await db.user.create({
      data: { email, password: hashed, name: name ?? email.split('@')[0] },
    })

    // Create verification token (expires in 24h)
    const token = randomBytes(32).toString('hex')
    await db.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Send verification email (logs to console in dev if RESEND_API_KEY not set)
    await sendVerificationEmail(email, token)

    return NextResponse.json(
      { message: 'VERIFICATION_EMAIL_SENT' },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: err.issues }, { status: 400 })
    }
    console.error('[register]', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
