import { EmailProvider, EmailOptions } from '../interface';

export class ResendProvider implements EmailProvider {
  async sendEmail(options: EmailOptions) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Resend] RESEND_API_KEY not set, skipping actual send.');
      return false;
    }
    console.log(`[Resend] Preparing to send email to ${options.to}`);
    // Actual implementation would use resend.emails.send()
    return true;
  }
}
