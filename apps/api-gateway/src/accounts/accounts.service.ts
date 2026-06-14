/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from '../schemas/account.schema';
import { Payment } from '../schemas/payment.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
  ) {}

  async createMockAccount(customerId: string, provider: string, providerAccountId: string) {
    const accountId = `acc_${Math.random().toString(36).substr(2, 9)}`;
    const newAccount = new this.accountModel({
      accountId,
      customerId,
      provider,
      providerAccountId,
      status: 'active',
    });
    return newAccount.save();
  }

  async closeAccount(accountId: string) {
    const account = await this.accountModel.findOneAndUpdate(
      { accountId },
      { status: 'closed' },
      { new: true },
    );
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async getAccount(accountId: string) {
    const account = await this.accountModel.findOne({ accountId });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async getAccountBalance(accountId: string) {
    await this.getAccount(accountId); // Validate existence
    return this.calculateBalance({ accountId });
  }

  async getCustomerBalance(customerId: string) {
    const accounts = await this.accountModel.find({ customerId });
    if (!accounts.length) throw new NotFoundException('Customer not found or has no accounts');
    const accountIds = accounts.map((a) => a.accountId);
    return this.calculateBalance({ accountId: { $in: accountIds } });
  }

  async getAccountPayments(accountId: string) {
    await this.getAccount(accountId); // Validate existence
    return this.paymentModel.find({ accountId }).sort({ createdAt: -1 });
  }

  async getCustomerPayments(customerId: string) {
    const accounts = await this.accountModel.find({ customerId });
    const accountIds = accounts.map((a) => a.accountId);
    return this.paymentModel.find({ accountId: { $in: accountIds } }).sort({ createdAt: -1 });
  }

  private async calculateBalance(matchCondition: any) {
    const payments = await this.paymentModel.find(matchCondition);
    let posted = 0;
    let available = 0;
    let currency = 'USD'; // Assuming single currency for simplicity or taking from first payment

    for (const payment of payments) {
      currency = payment.currency; // Update currency

      const isCredit = payment.direction === 'credit';
      const amount = isCredit ? payment.amount : -payment.amount;

      if (payment.status === 'sent') {
        posted += amount;
        available += amount;
      } else if (payment.status === 'returned') {
        // Returned is a reversal of 'sent'.
        // If it was an incoming credit, we lose the money. If outgoing debit, we get it back.
        // Wait, 'posted' is net of any 'returned'. So we don't add returned to posted.
        // Actually, if it's returned, it shouldn't be in posted anymore. Or rather,
        // sent adds it, returned subtracts it.
        // If it never reached 'sent', it shouldn't have affected posted anyway.
      } else if (['draft', 'pending', 'clearing'].includes(payment.status)) {
        // In-flight outgoing debits reduce available balance
        if (!isCredit) {
          available += amount; // amount is negative, so this subtracts
        }
      }
    }

    return { posted, available, currency };
  }
}
