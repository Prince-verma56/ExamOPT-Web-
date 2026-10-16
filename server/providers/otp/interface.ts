export interface OtpProvider {
  sendCode(identifier: string): Promise<boolean>;
  verifyCode(identifier: string, code: string): Promise<boolean>;
  invalidateCode(identifier: string): Promise<void>;
}
