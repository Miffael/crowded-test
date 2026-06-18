import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    originatePayment: jest.fn().mockResolvedValue({ paymentId: 'pay_1', status: 'draft' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should pass idempotency key and mock outcome to service', async () => {
    await controller.createPayment('idem_1', 'rejected', {
      accountId: 'acc_1',
      amount: 100,
      currency: 'USD',
      direction: 'credit',
    });
    expect(mockPaymentsService.originatePayment).toHaveBeenCalledWith(
      'acc_1',
      100,
      'USD',
      'credit',
      'idem_1',
      'rejected',
    );
  });
});
