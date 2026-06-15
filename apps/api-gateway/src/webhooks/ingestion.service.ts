/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from '../schemas/payment.schema';
import { WebhookEvent } from '../schemas/webhook-event.schema';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEvent>,
  ) {}

  async processWebhook(eventId: string, provider: string, paymentId: string, status: string) {
    // 1. Deduplicate
    try {
      await this.webhookEventModel.create({ eventId, provider });
    } catch (e: any) {
      if (e.code === 11000) {
        this.logger.warn(`Duplicate webhook event ignored: ${eventId}`);
        return; // Already processed
      }
      throw e;
    }

    // 2. Fetch payment
    const payment = await this.paymentModel.findOne({
      providerPaymentId: paymentId as string,
      provider: provider as any,
    });
    if (!payment) {
      this.logger.error(`Webhook referenced unknown payment: ${paymentId}`);
      return; // "quarantine/dead-letter is a stronger answer" - per spec, skipping is acceptable baseline.
    }

    // 3. State machine validation (handling out-of-order arrivals)
    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'clearing', 'sent', 'rejected', 'returned'],
      pending: ['clearing', 'sent', 'rejected', 'returned'],
      clearing: ['sent', 'rejected', 'returned'],
      sent: ['returned'],
      returned: [],
      rejected: [],
    };

    if (!validTransitions[payment.status]?.includes(status)) {
      this.logger.warn(
        `Ignoring invalid or out-of-order state transition for payment ${paymentId}: ${payment.status} -> ${status}`,
      );
      return;
    }

    // Apply state
    payment.status = status as any;
    await payment.save();
    this.logger.log(`Payment ${paymentId} updated to ${status}`);
  }
}
