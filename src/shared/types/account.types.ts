export type ProviderType = 'provider-a' | 'provider-b';

export type AccountStatus = 'active' | 'closed';

export interface Account {
  accountId: string;
  customerId: string;
  provider: ProviderType;
  providerAccountId: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
