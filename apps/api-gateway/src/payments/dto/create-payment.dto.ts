import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'acc_123',
    description: 'The internal ID of the account originating the payment',
  })
  accountId!: string;

  @ApiProperty({
    example: 100,
    description: 'The amount of the payment in cents (or minor currency units)',
  })
  amount!: number;

  @ApiProperty({
    example: 'USD',
    description: 'The currency code (e.g. USD)',
  })
  currency!: string;

  @ApiProperty({
    example: 'credit',
    enum: ['credit', 'debit'],
    description: 'The direction of the payment',
  })
  direction!: 'credit' | 'debit';
}
