import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'acc_123',
    description: 'The internal ID of the account originating the payment',
  })
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({
    example: 100,
    description: 'The amount of the payment in cents (or minor currency units)',
  })
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({
    example: 'USD',
    description: 'The currency code (e.g. USD)',
  })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({
    example: 'credit',
    enum: ['credit', 'debit'],
    description: 'The direction of the payment',
  })
  @IsString()
  @IsIn(['credit', 'debit'])
  @IsNotEmpty()
  direction!: 'credit' | 'debit';
}
