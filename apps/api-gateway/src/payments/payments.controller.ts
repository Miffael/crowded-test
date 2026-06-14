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

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
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
    @Body()
    body: { accountId: string; amount: number; currency: string; direction: 'credit' | 'debit' },
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
  @UseGuards(AuthGuard('jwt'))
  @Get('payments/:paymentId')
  @ApiOperation({ summary: 'Get one payment with current state' })
  async getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.getPayment(paymentId);
  }
}
