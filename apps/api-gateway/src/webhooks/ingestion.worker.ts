/* eslint-disable @typescript-eslint/no-explicit-any */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';
import { Logger } from '@nestjs/common';

@Processor('webhooks')
export class IngestionWorker extends WorkerHost {
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { eventId, provider, paymentId, status } = job.data;
    this.logger.log(`Processing webhook event ${eventId} for payment ${paymentId}`);

    await this.ingestionService.processWebhook(eventId, provider, paymentId, status);
  }
}
