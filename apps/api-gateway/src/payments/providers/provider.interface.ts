import { Payment } from '../../schemas/payment.schema';

export interface ProviderAdapter {
  originatePayment(payment: Payment): Promise<{
    status: 'draft' | 'pending' | 'rejected';
    providerPaymentId?: string;
  }>;
}
