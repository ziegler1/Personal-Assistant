import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendExportEmail(subject: string, text: string, attachment: EmailAttachment): Promise<void> {
  if (!config.smtp.host || !config.notifyEmail) {
    throw Object.assign(
      new Error('Email export is not configured. Set SMTP_HOST, SMTP_* credentials, and NOTIFY_EMAIL.'),
      { status: 503 }
    );
  }

  await getTransporter().sendMail({
    from: config.smtp.from || config.smtp.user,
    to: config.notifyEmail,
    subject,
    text,
    attachments: [attachment],
  });
}
