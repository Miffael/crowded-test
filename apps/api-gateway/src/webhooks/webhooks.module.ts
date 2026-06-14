import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { IngestionService } from './ingestion.service';
import { IngestionWorker } from './ingestion.worker';
import { Payment, PaymentSchema } from '../schemas/payment.schema';
import { WebhookEvent, WebhookEventSchema } from '../schemas/webhook-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: WebhookEvent.name, schema: WebhookEventSchema },
    ]),
    BullModule.registerQueue({
      name: 'webhooks',
    }),
  ],
  controllers: [WebhooksController],
  providers: [IngestionService, IngestionWorker],
})
export class WebhooksModule {}
