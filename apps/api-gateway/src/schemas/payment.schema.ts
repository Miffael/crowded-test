import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true, unique: true })
  paymentId!: string; // Internal idempotency key or generated ID

  @Prop()
  providerPaymentId!: string; // ID returned by provider A or B

  @Prop({ required: true })
  accountId!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  currency!: string;

  @Prop({ required: true })
  direction!: 'credit' | 'debit';

  @Prop({ required: true })
  provider!: 'ProviderA' | 'ProviderB';

  @Prop({ required: true })
  status!: 'draft' | 'pending' | 'clearing' | 'sent' | 'returned' | 'rejected';
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
