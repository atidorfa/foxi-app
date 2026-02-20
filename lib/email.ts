import { Resend } from 'resend'

// Lazy init — avoids crash at build time when RESEND_API_KEY is not set
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`

  // Dev fallback: if no API key configured, just log the URL
  if (!process.env.RESEND_API_KEY) {
    console.log('\n[DEV] ─────────────────────────────────────────')
    console.log('[DEV] Verification email would be sent to:', to)
    console.log('[DEV] Click to verify:', verifyUrl)
    console.log('[DEV] ─────────────────────────────────────────\n')
    return
  }

  const from = process.env.EMAIL_FROM ?? 'therian.biz <noreply@therian.biz>'

  await getResend().emails.send({
    from,
    to,
    subject: 'Verificá tu email — therian.biz',
    html: buildEmailHtml(verifyUrl),
  })
}

function buildEmailHtml(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verificá tu email — therian.biz</title>
</head>
<body style="margin:0;padding:0;background:#08080F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080F;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13131F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 24px;">
              <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,#a78bfa,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                therian.biz
              </h1>
              <p style="margin:8px 0 0;color:#8B84B0;font-size:14px;font-style:italic;">
                Tu compañero ya existe. Solo falta confirmarlo.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:rgba(255,255,255,0.05);"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;color:#C4BDD8;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">Alguien (esperamos que vos) creó una cuenta con este email.</p>
              <p style="margin:0 0 28px;">Para activarla y acceder a tu Therian, hacé click en el botón de abajo. El link es válido por <strong style="color:#fff;">24 horas</strong>.</p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 28px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                      ✓ Verificar email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#8B84B0;font-size:12px;">
                Si el botón no funciona, copiá y pegá este link en tu navegador:
              </p>
              <p style="margin:0;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#9F7AEA;font-size:12px;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.05);margin-bottom:24px;"></div>
              <p style="margin:0;color:#4A4468;font-size:12px;text-align:center;">
                Si no creaste una cuenta en therian.biz, ignorá este email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
