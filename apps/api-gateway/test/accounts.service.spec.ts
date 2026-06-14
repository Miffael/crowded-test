import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../src/accounts/accounts.service';
import { getModelToken } from '@nestjs/mongoose';
import { Account } from '../src/schemas/account.schema';
import { Payment } from '../src/schemas/payment.schema';

describe('AccountsService', () => {
  let service: AccountsService;

  const mockAccountModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockPaymentModel = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: getModelToken(Account.name), useValue: mockAccountModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateBalance', () => {
    it('should calculate posted and available balance correctly for mixed payments', async () => {
      mockAccountModel.findOne.mockResolvedValue({ accountId: 'acc_1', status: 'active' });
      mockPaymentModel.find.mockResolvedValue([
        { amount: 1000, direction: 'credit', status: 'sent', currency: 'USD' }, // +1000 posted, +1000 available
        { amount: 200, direction: 'debit', status: 'sent', currency: 'USD' }, // -200 posted, -200 available
        { amount: 100, direction: 'debit', status: 'pending', currency: 'USD' }, // 0 posted, -100 available
        { amount: 50, direction: 'credit', status: 'pending', currency: 'USD' }, // 0 posted, 0 available (incoming doesn't affect available until sent)
      ]);

      const result = await service.getAccountBalance('acc_1');

      expect(result.posted).toBe(800); // 1000 - 200
      expect(result.available).toBe(700); // 1000 - 200 - 100
      expect(result.currency).toBe('USD');
    });
  });
});
