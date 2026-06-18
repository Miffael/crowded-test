/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from '../src/webhooks/ingestion.service';
import { getModelToken } from '@nestjs/mongoose';
import { Payment } from '../src/schemas/payment.schema';
import { WebhookEvent } from '../src/schemas/webhook-event.schema';

describe('IngestionService', () => {
  let service: IngestionService;

  const mockPaymentModel = {
    findOne: jest.fn(),
  };

  const mockWebhookEventModel = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: getModelToken(WebhookEvent.name), useValue: mockWebhookEventModel },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
  });

  describe('processWebhook', () => {
    it('should deduplicate events', async () => {
      const error = new Error('duplicate');
      (error as any).code = 11000;
      mockWebhookEventModel.create.mockRejectedValue(error);

      await service.processWebhook('evt_1', 'ProviderA', 'pay_1', 'sent');
      expect(mockPaymentModel.findOne).not.toHaveBeenCalled();
    });

    it('should ignore out-of-order state transitions (e.g. pending after sent)', async () => {
      mockWebhookEventModel.create.mockResolvedValue(true);
      const paymentSaveMock = jest.fn();
      mockPaymentModel.findOne.mockResolvedValue({ status: 'sent', save: paymentSaveMock });

      await service.processWebhook('evt_1', 'ProviderA', 'pay_1', 'pending');
      expect(paymentSaveMock).not.toHaveBeenCalled(); // Ignored because pending < sent
    });

    it('should update state if valid transition', async () => {
      mockWebhookEventModel.create.mockResolvedValue(true);
      const paymentSaveMock = jest.fn();
      const mockPayment = { status: 'pending', save: paymentSaveMock };
      mockPaymentModel.findOne.mockResolvedValue(mockPayment);

      await service.processWebhook('evt_1', 'ProviderA', 'pay_1', 'sent');
      expect(mockPayment.status).toBe('sent');
      expect(paymentSaveMock).toHaveBeenCalled();
    });
  });
});
