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

export async function sendExportEmail(
  subject: string,
  text: string,
  attachment: EmailAttachment | null,
  to?: string
): Promise<void> {
  const recipient = to || config.notifyEmail;
  if (!config.smtp.host || !recipient) {
    throw Object.assign(
      new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, and NOTIFY_EMAIL in the server environment.'),
      { status: 503 }
    );
  }

  const mailOptions: Parameters<ReturnType<typeof getTransporter>['sendMail']>[0] = {
    from: config.smtp.from || config.smtp.user,
    to: recipient,
    subject,
    text,
  };
  if (attachment) {
    mailOptions.attachments = [attachment];
  }

  await getTransporter().sendMail(mailOptions);
}
