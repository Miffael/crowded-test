export type PaymentStatus =
  | 'draft' // draft
  | 'pending' // pending
  | 'clearing' // clearing
  | 'sent' // sent
  | 'returned' // returned
  | 'rejected'; // rejected

export type PaymentDirection = 'credit' | 'debit';

export interface Payment {
  paymentId: string;
  accountId: string;
  amount: number; // positive integer in minor units (cents)
  currency: string; // e.g., 'USD'
  direction: PaymentDirection;
  status: PaymentStatus;
  idempotencyKey?: string; // unique/sparse key for idempotent origination
  providerPaymentId?: string; // external vendor reference (payment_id / transfer_id)
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
}
