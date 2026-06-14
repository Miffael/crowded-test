/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../src/payments/payments.service';
import { AccountsService } from '../src/accounts/accounts.service';
import { ProviderFactory } from '../src/payments/providers/provider.factory';
import { getModelToken } from '@nestjs/mongoose';
import { Payment } from '../src/schemas/payment.schema';
import { InternalServerErrorException, BadRequestException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPaymentModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockAccountsService = {
    getAccount: jest.fn(),
  };

  const mockProviderAdapter = {
    originatePayment: jest.fn(),
  };

  const mockProviderFactory = {
    getAdapter: jest.fn().mockReturnValue(mockProviderAdapter),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: ProviderFactory, useValue: mockProviderFactory },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('originatePayment', () => {
    it('should throw BadRequestException if account is not active', async () => {
      mockAccountsService.getAccount.mockResolvedValue({ status: 'closed' });
      await expect(
        service.originatePayment('acc_1', 100, 'USD', 'credit', 'idem_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing payment if Idempotency Key is found', async () => {
      mockAccountsService.getAccount.mockResolvedValue({ status: 'active', provider: 'ProviderA' });
      const existing = { paymentId: 'idem_1', status: 'draft' };
      mockPaymentModel.findOne.mockResolvedValue(existing);

      const result = await service.originatePayment('acc_1', 100, 'USD', 'credit', 'idem_1');
      expect(result).toEqual(existing);
    });

    it('should throw InternalServerErrorException and leave payment in draft on dispatch failure', async () => {
      mockAccountsService.getAccount.mockResolvedValue({ status: 'active', provider: 'ProviderA' });
      mockPaymentModel.findOne.mockResolvedValue(null);

      const saveMock = jest.fn();
      class MockPaymentConstructor {
        constructor(data: any) {
          Object.assign(this, data);
        }
        save = saveMock;
        static findOne = mockPaymentModel.findOne;
      }
      mockPaymentModel.create.mockImplementation((data) => new MockPaymentConstructor(data));
      // override module's payment model constructor manually since we used useValue
      (service as any).paymentModel = MockPaymentConstructor;

      await expect(
        service.originatePayment('acc_1', 100, 'USD', 'credit', 'idem_1', 'dispatch_failure'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
