import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsController } from './accounts.controller';
import { CustomersController } from './customers.controller';
import { AccountsService } from './accounts.service';
import { Account, AccountSchema } from '../schemas/account.schema';
import { Payment, PaymentSchema } from '../schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AccountsController, CustomersController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
