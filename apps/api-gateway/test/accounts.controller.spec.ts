import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from '../src/accounts/accounts.controller';
import { AccountsService } from '../src/accounts/accounts.service';

describe('AccountsController', () => {
  let controller: AccountsController;

  const mockAccountsService = {
    createMockAccount: jest.fn().mockResolvedValue({ accountId: 'acc_1' }),
    getAccountBalance: jest.fn().mockResolvedValue({ posted: 100, available: 100 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: mockAccountsService }],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
  });

  it('should call getAccountBalance on service', async () => {
    await controller.getAccountBalance('acc_1');
    expect(mockAccountsService.getAccountBalance).toHaveBeenCalledWith('acc_1');
  });
});
