import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    example: 'cust_456',
    description: 'The internal ID of the customer linking the account',
  })
  customerId!: string;

  @ApiProperty({
    example: 'ProviderA',
    description: 'The BaaS provider (e.g. ProviderA or ProviderB)',
  })
  provider!: string;

  @ApiProperty({
    example: 'ext_acc_789',
    description: 'The external account ID from the provider',
  })
  providerAccountId!: string;
}
