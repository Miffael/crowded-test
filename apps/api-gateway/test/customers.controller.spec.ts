import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from '../src/accounts/customers.controller';
import { AccountsService } from '../src/accounts/accounts.service';

describe('CustomersController', () => {
  let controller: CustomersController;

  const mockAccountsService = {
    getCustomerBalance: jest.fn().mockResolvedValue({ posted: 200, available: 150 }),
    getCustomerPayments: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: AccountsService, useValue: mockAccountsService }],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  it('should call getCustomerBalance on service', async () => {
    await controller.getCustomerBalance('cust_1');
    expect(mockAccountsService.getCustomerBalance).toHaveBeenCalledWith('cust_1');
  });

  it('should call getCustomerPayments on service', async () => {
    await controller.getCustomerPayments('cust_1');
    expect(mockAccountsService.getCustomerPayments).toHaveBeenCalledWith('cust_1');
  });
});
