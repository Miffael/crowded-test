import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
    AccountsModule, // For account validation
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, ProviderFactory, ProviderAAdapter, ProviderBAdapter],
  exports: [PaymentsService],
})
export class PaymentsModule {}
