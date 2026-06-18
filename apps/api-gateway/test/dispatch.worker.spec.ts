import { Test, TestingModule } from '@nestjs/testing';
import { DispatchWorker } from '../src/payments/dispatch.worker';
import { ProviderFactory } from '../src/payments/providers/provider.factory';
import { getModelToken } from '@nestjs/mongoose';
import { Payment } from '../src/schemas/payment.schema';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

describe('DispatchWorker', () => {
  let worker: DispatchWorker;

  const mockPaymentModel = {
    findOne: jest.fn(),
  };

  const mockAdapter = {
    originatePayment: jest.fn(),
  };

  const mockProviderFactory = {
    getAdapter: jest.fn().mockReturnValue(mockAdapter),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchWorker,
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: ProviderFactory, useValue: mockProviderFactory },
      ],
    }).compile();

    worker = module.get<DispatchWorker>(DispatchWorker);

    // Silence logger to keep test output clean
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should skip retry if payment is not found', async () => {
      mockPaymentModel.findOne.mockResolvedValue(null);
      const mockJob = { data: { paymentId: 'idem_1' }, attemptsMade: 0 } as Job;

      await worker.process(mockJob);
      expect(mockAdapter.originatePayment).not.toHaveBeenCalled();
    });

    it('should skip retry if payment is no longer in draft', async () => {
      mockPaymentModel.findOne.mockResolvedValue({ paymentId: 'idem_1', status: 'pending' });
      const mockJob = { data: { paymentId: 'idem_1' }, attemptsMade: 0 } as Job;

      await worker.process(mockJob);
      expect(mockAdapter.originatePayment).not.toHaveBeenCalled();
    });

    it('should dispatch payment and update status if in draft', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockPayment: Record<string, unknown> = {
        paymentId: 'idem_1',
        status: 'draft',
        provider: 'ProviderA',
        save: mockSave,
      };

      mockPaymentModel.findOne.mockResolvedValue(mockPayment);
      mockAdapter.originatePayment.mockResolvedValue({
        status: 'pending',
        providerPaymentId: 'pay_123',
      });

      const mockJob = { data: { paymentId: 'idem_1' }, attemptsMade: 1 } as Job;

      await worker.process(mockJob);

      expect(mockAdapter.originatePayment).toHaveBeenCalledWith(mockPayment);
      expect(mockPayment.status).toBe('pending');
      expect(mockPayment.providerPaymentId).toBe('pay_123');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error if adapter fails to allow BullMQ to retry', async () => {
      const mockPayment = {
        paymentId: 'idem_1',
        status: 'draft',
        provider: 'ProviderA',
      };

      mockPaymentModel.findOne.mockResolvedValue(mockPayment);
      mockAdapter.originatePayment.mockRejectedValue(new Error('Network Error'));

      const mockJob = { data: { paymentId: 'idem_1' }, attemptsMade: 1 } as Job;

      await expect(worker.process(mockJob)).rejects.toThrow('Network Error');
    });
  });

  describe('onFailed', () => {
    it('should log an error when all attempts are exhausted', () => {
      const mockJob = {
        data: { paymentId: 'idem_1' },
        attemptsMade: 4,
        opts: { attempts: 4 },
      } as unknown as Job;

      worker.onFailed(mockJob, new Error('Final failure'));

      // Expected to call logger.error since attemptsMade === opts.attempts
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Payment idem_1 failed all dispatch retries'),
      );
    });

    it('should not log final error if attempts are not exhausted', () => {
      const mockJob = {
        data: { paymentId: 'idem_1' },
        attemptsMade: 2,
        opts: { attempts: 4 },
      } as unknown as Job;

      worker.onFailed(mockJob, new Error('Temporary failure'));

      expect(Logger.prototype.error).not.toHaveBeenCalled();
    });
  });
});
