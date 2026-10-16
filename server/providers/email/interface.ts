export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}
