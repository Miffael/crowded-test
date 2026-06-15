import { Module } from '@nestjs/common';
import { DispatchWorker } from './dispatch.worker';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ProviderFactory } from './providers/provider.factory';
import { ProviderAAdapter } from './providers/provider-a.adapter';
import { ProviderBAdapter } from './providers/provider-b.adapter';
import { AccountsModule } from '../accounts/accounts.module';
import { Payment, PaymentSchema } from '../schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    AccountsModule,
    BullModule.registerQueue({
      name: 'dispatch-retries',
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, ProviderFactory, DispatchWorker, ProviderAAdapter, ProviderBAdapter],
  exports: [PaymentsService],
})
export class PaymentsModule {}
