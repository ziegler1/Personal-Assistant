export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function sendExportEmail(
  subject: string,
  text: string,
  attachment: EmailAttachment | null,
  to?: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = to || process.env.NOTIFY_EMAIL;
  const from = process.env.SMTP_FROM || 'onboarding@resend.dev';

  if (!apiKey || !recipient) {
    throw Object.assign(
      new Error('Email is not configured. Set RESEND_API_KEY and NOTIFY_EMAIL in the server environment.'),
      { status: 503 }
    );
  }

  const body: Record<string, unknown> = {
    from,
    to: recipient,
    subject,
    text,
  };

  if (attachment) {
    body.attachments = [{
      filename: attachment.filename,
      content: attachment.content.toString('base64'),
    }];
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(
      new Error(`Resend API error: ${JSON.stringify(error)}`),
      { status: 502 }
    );
  }
}