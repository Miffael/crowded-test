import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ required: true })
  accountId!: string;

  @Prop({ required: true })
  customerId!: string;

  @Prop({ required: true })
  provider!: string; // 'ProviderA' or 'ProviderB'

  @Prop({ required: true })
  providerAccountId!: string;

  @Prop({ required: true, default: 'active' })
  status!: string; // 'active' or 'closed'
}

export const AccountSchema = SchemaFactory.createForClass(Account);
