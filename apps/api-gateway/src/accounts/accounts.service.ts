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
    const [result] = await this.paymentModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          posted: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'sent'] },
                {
                  $cond: [
                    { $eq: ['$direction', 'credit'] },
                    '$amount',
                    { $multiply: ['$amount', -1] },
                  ],
                },
                0,
              ],
            },
          },
          pendingDebits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['draft', 'pending', 'clearing']] },
                    { $eq: ['$direction', 'debit'] },
                  ],
                },
                { $multiply: ['$amount', -1] },
                0,
              ],
            },
          },
          currency: { $first: '$currency' },
        },
      },
    ]);

    const posted = result?.posted || 0;
    const pendingDebits = result?.pendingDebits || 0;
    const available = posted + pendingDebits;
    const currency = result?.currency || 'USD';

    return { posted, available, currency };
  }
}
