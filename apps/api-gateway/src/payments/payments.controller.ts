import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@shared/types/role.types';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @Post('payments')
  @ApiOperation({ summary: 'Originate outgoing ACH credit' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({
    name: 'X-Mock-Outcome',
    required: false,
    description: 'rejected | dispatch_failure',
  })
  async createPayment(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Headers('X-Mock-Outcome') mockOutcome: string,
    @Body() body: CreatePaymentDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return this.paymentsService.originatePayment(
      body.accountId,
      body.amount,
      body.currency,
      body.direction,
      idempotencyKey,
      mockOutcome,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Get one payment with current state' })
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPayment(paymentId);
  }
}
