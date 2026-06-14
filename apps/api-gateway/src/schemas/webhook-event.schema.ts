import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class WebhookEvent extends Document {
  @Prop({ required: true, unique: true })
  eventId!: string; // Provider's unique event ID to prevent replay

  @Prop({ required: true })
  provider!: string; // 'ProviderA' or 'ProviderB'
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);

// Ensure fast lookup for deduplication
WebhookEventSchema.index({ eventId: 1, provider: 1 }, { unique: true });
