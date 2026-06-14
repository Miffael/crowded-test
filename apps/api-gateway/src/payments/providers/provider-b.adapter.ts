import { Injectable } from '@nestjs/common';
import { ProviderAdapter } from './provider.interface';
import { Payment } from '../../schemas/payment.schema';

@Injectable()
export class ProviderBAdapter implements ProviderAdapter {
  async originatePayment(
    payment: Payment,
  ): Promise<{ status: 'draft' | 'pending' | 'rejected'; providerPaymentId?: string }> {
    // Mock Provider B call
    // Provider B returns `pending` or `rejected` on successful dispatch.
    return {
      status: 'pending', // We could return 'rejected' based on some mock logic, but 'pending' is the happy path.
      providerPaymentId: `trf_b_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}
