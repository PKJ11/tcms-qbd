import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error(
      'Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
    )
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const transporter = createTransporter()

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER

  await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    ...(text && { text }),
  })
}