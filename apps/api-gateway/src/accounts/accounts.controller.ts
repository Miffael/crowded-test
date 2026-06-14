import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AccountsService } from './accounts.service';

@ApiTags('accounts')
@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('mock/accounts')
  @ApiOperation({ summary: 'Setup: Open an active account' })
  async createMockAccount(
    @Body() body: { customerId: string; provider: string; providerAccountId: string },
  ) {
    return this.accountsService.createMockAccount(
      body.customerId,
      body.provider,
      body.providerAccountId,
    );
  }

  @Post('mock/accounts/:accountId/close')
  @ApiOperation({ summary: 'Setup: Set account to closed' })
  async closeAccount(@Param('accountId') accountId: string) {
    return this.accountsService.closeAccount(accountId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('accounts/:accountId/balance')
  @ApiOperation({ summary: 'Per-account posted + available balance' })
  async getAccountBalance(@Param('accountId') accountId: string) {
    return this.accountsService.getAccountBalance(accountId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('accounts/:accountId/payments')
  @ApiOperation({ summary: 'Payments for one account' })
  async getAccountPayments(@Param('accountId') accountId: string) {
    return this.accountsService.getAccountPayments(accountId);
  }
}
