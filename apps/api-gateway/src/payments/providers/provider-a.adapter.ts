import { Injectable } from '@nestjs/common';
import { ProviderAdapter } from './provider.interface';
import { Payment } from '../../schemas/payment.schema';

@Injectable()
export class ProviderAAdapter implements ProviderAdapter {
  async originatePayment(
    _payment: Payment,
  ): Promise<{ status: 'draft' | 'pending' | 'rejected'; providerPaymentId?: string }> {
    // Mock Provider A call
    // Provider A returns `draft` on a successful dispatch.
    return {
      status: 'draft',
      providerPaymentId: `pay_a_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}
