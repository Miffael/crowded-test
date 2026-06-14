export type CustomerStatus = 'active' | 'deactivated';

export interface Customer {
  customerId: string;
  name: string;
  status: CustomerStatus;
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
