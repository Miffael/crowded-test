import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { ProviderFactory } from './providers/provider.factory';

@Processor('dispatch-retries')
export class DispatchWorker extends WorkerHost {
  private readonly logger = new Logger(DispatchWorker.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly providerFactory: ProviderFactory,
  ) {
    super();
  }

  async process(job: Job<{ paymentId: string }, void, string>): Promise<void> {
    const { paymentId } = job.data;
    this.logger.log(
      `BullMQ retry attempt ${job.attemptsMade + 1} for dispatching payment ${paymentId}`,
    );

    const payment = await this.paymentModel.findOne({ paymentId });
    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found during retry.`);
      return;
    }

    if (payment.status !== 'draft') {
      this.logger.log(`Payment ${paymentId} is no longer in draft. Skipping retry.`);
      return;
    }

    const adapter = this.providerFactory.getAdapter(payment.provider);

    // Attempt dispatch
    const outcome = await adapter.originatePayment(payment);

    // Update outcome
    payment.status = outcome.status as
      | 'draft'
      | 'pending'
      | 'rejected'
      | 'clearing'
      | 'sent'
      | 'returned';
    payment.providerPaymentId = outcome.providerPaymentId as string;
    await payment.save();

    this.logger.log(`Successfully dispatched payment ${paymentId} on retry.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    // BullMQ failed event. If this was the last attempt, it won't be retried again.
    // The job.attemptsMade will equal job.opts.attempts when fully failed.
    if (job.attemptsMade === job.opts.attempts) {
      this.logger.error(
        `Payment ${job.data.paymentId} failed all dispatch retries! Error: ${error.message}`,
      );
      // TODO: Add an email notification system to notify that the payment has failed
    }
  }
}
