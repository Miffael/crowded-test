import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@shared/types/role.types';

@ApiTags('accounts')
@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post('mock/accounts')
  @ApiOperation({ summary: 'Setup: Open an active account' })
  async createMockAccount(@Body() body: CreateAccountDto) {
    return this.accountsService.createMockAccount(
      body.customerId,
      body.provider,
      body.providerAccountId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post('mock/accounts/:accountId/close')
  @ApiOperation({ summary: 'Setup: Set account to closed' })
  async closeAccount(@Param('accountId') accountId: string) {
    return this.accountsService.closeAccount(accountId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get('accounts/:accountId/balance')
  @ApiOperation({ summary: 'Per-account posted + available balance' })
  async getAccountBalance(@Param('accountId') accountId: string) {
    return this.accountsService.getAccountBalance(accountId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get('accounts/:accountId/payments')
  @ApiOperation({ summary: 'Payments for one account' })
  async getAccountPayments(@Param('accountId') accountId: string) {
    return this.accountsService.getAccountPayments(accountId);
  }
}
