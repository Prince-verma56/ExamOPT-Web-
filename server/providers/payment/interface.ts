/**
 * PaymentProvider Interface
 *
 * Abstracts payment creation, verification, refund, and webhook handling.
 * Application code imports this, not the vendor SDK.
 */

export interface CreateOrderInput {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  providerOrderId?: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface RefundInput {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'processed' | 'pending' | 'failed';
}

export interface WebhookEvent {
  type: string;
  payload: unknown;
}

export interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
  refund(input: RefundInput): Promise<RefundResult>;
  handleWebhook(body: unknown, headers: Record<string, string>): Promise<WebhookEvent>;
}
