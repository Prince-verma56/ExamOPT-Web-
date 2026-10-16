export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  createOrder(amount: number, currency: string, receiptId: string): Promise<PaymentOrder>;
  verifyPayment(signature: string, orderId: string, paymentId: string): boolean;
  refund?(paymentId: string, amount?: number): Promise<boolean>;
}
