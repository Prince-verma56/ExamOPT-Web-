import { OtpProvider } from '../interface';

export class MockOtpProvider implements OtpProvider {
  private codes = new Map<string, string>();

  async sendCode(identifier: string) {
    const code = "123456"; // Fixed for mock
    this.codes.set(identifier, code);
    console.log(`[MockOTP] Code ${code} sent to ${identifier}`);
    return true;
  }

  async verifyCode(identifier: string, code: string) {
    const stored = this.codes.get(identifier);
    return stored === code;
  }

  async invalidateCode(identifier: string) {
    this.codes.delete(identifier);
  }
}
