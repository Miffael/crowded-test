/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { AccountsService } from '../accounts/accounts.service';
import { ProviderFactory } from './providers/provider.factory';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly accountsService: AccountsService,
    private readonly providerFactory: ProviderFactory,
    @InjectQueue('dispatch-retries') private readonly dispatchQueue: Queue,
  ) {}

  async originatePayment(
    accountId: string,
    amount: number,
    currency: string,
    direction: 'credit' | 'debit',
    idempotencyKey: string,
    mockOutcome?: string,
  ) {
    // 1. Validate account exists and is active
    const account = await this.accountsService.getAccount(accountId);
    if (account.status !== 'active') {
      throw new BadRequestException('Account is not active');
    }

    // 2. Check Idempotency Key (Return existing if found)
    const existingPayment = await this.paymentModel.findOne({ paymentId: idempotencyKey });
    if (existingPayment) {
      if (existingPayment.status === 'draft') {
        // If it failed transport previously, it's still in draft. We should retry dispatch here.
        try {
          const adapter = this.providerFactory.getAdapter(account.provider);

          if (mockOutcome === 'dispatch_failure') {
            throw new InternalServerErrorException('Transport failure');
          }

          let outcome;
          if (mockOutcome === 'rejected' && account.provider === 'ProviderB') {
            outcome = {
              status: 'rejected',
              providerPaymentId: `trf_b_rej_${Math.random().toString(36).substr(2, 9)}`,
            };
          } else {
            outcome = await adapter.originatePayment(existingPayment);
          }

          existingPayment.status = outcome.status as any;
          existingPayment.providerPaymentId = outcome.providerPaymentId as string;
          await existingPayment.save();
          return existingPayment;
        } catch (error) {
          await this.dispatchQueue.add(
            'dispatch',
            { paymentId: existingPayment.paymentId },
            {
              attempts: 4,
              backoff: { type: 'exponential', delay: 2000 },
            },
          );
          throw new InternalServerErrorException(
            'Dispatch to provider failed again on retry. Payment recorded in draft and queued for retry.',
          );
        }
      }
      return existingPayment;
    }

    // 3. Record the payment as draft
    const newPayment = new this.paymentModel({
      paymentId: idempotencyKey,
      accountId,
      amount,
      currency,
      direction,
      provider: account.provider,
      status: 'draft',
    });
    await newPayment.save();

    // 4. Call provider inline
    const adapter = this.providerFactory.getAdapter(account.provider);

    try {
      if (mockOutcome === 'dispatch_failure') {
        throw new InternalServerErrorException('Transport failure');
      }

      let outcome;
      if (mockOutcome === 'rejected' && account.provider === 'ProviderB') {
        outcome = {
          status: 'rejected',
          providerPaymentId: `trf_b_rej_${Math.random().toString(36).substr(2, 9)}`,
        };
      } else {
        outcome = await adapter.originatePayment(newPayment);
      }

      // Update payment with outcome
      newPayment.status = outcome.status as any;
      newPayment.providerPaymentId = outcome.providerPaymentId as string;
      await newPayment.save();

      return newPayment;
    } catch (error) {
      // Transport failure: keep as draft, bubble error, but enqueue for retry
      await this.dispatchQueue.add(
        'dispatch',
        { paymentId: newPayment.paymentId },
        {
          attempts: 4, // 1 inline + 4 retries = 5 attempts
          backoff: { type: 'exponential', delay: 2000 },
        },
      );

      throw new InternalServerErrorException(
        'Dispatch to provider failed. Payment recorded in draft and queued for retry.',
      );
    }
  }

  async getPayment(paymentId: string) {
    const payment = await this.paymentModel.findOne({ paymentId });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
