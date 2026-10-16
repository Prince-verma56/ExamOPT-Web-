import { PaymentProvider, PaymentOrder } from '../interface';

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(amount: number, currency: string, _receiptId: string): Promise<PaymentOrder> {
    const id = `mock_order_${Date.now()}`;
    console.log(`[MockPayment] Created order ${id} for ${amount} ${currency}`);
    return { id, amount, currency };
  }

  verifyPayment(signature: string, orderId: string, _paymentId: string) {
    console.log(`[MockPayment] Verifying signature for ${orderId}`);
    return signature === 'mock_valid_signature';
  }

  async refund(paymentId: string, _amount?: number) {
    console.log(`[MockPayment] Refunding ${paymentId}`);
    return true;
  }
}
