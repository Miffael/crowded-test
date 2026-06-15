import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({
    example: 'cust_456',
    description: 'The internal ID of the customer linking the account',
  })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({
    example: 'ProviderA',
    description: 'The BaaS provider (e.g. ProviderA or ProviderB)',
  })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({
    example: 'ext_acc_789',
    description: 'The external account ID from the provider',
  })
  @IsString()
  @IsNotEmpty()
  providerAccountId!: string;
}
