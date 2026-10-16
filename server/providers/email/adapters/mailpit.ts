import { EmailProvider, EmailOptions } from '../interface';

export class MailpitProvider implements EmailProvider {
  async sendEmail(options: EmailOptions) {
    console.log(`[Mailpit] Sending email to ${options.to}`);
    console.log(`[Mailpit] Subject: ${options.subject}`);
    // Simulated Mailpit send
    return true;
  }
}
