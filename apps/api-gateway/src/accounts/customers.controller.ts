import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AccountsService } from './accounts.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@shared/types/role.types';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get(':customerId/balance')
  @ApiOperation({ summary: 'Unified posted + available across customer accounts' })
  async getCustomerBalance(@Param('customerId') customerId: string) {
    return this.accountsService.getCustomerBalance(customerId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get(':customerId/payments')
  @ApiOperation({ summary: 'Unified payment list across customer accounts' })
  async getCustomerPayments(@Param('customerId') customerId: string) {
    return this.accountsService.getCustomerPayments(customerId);
  }
}
