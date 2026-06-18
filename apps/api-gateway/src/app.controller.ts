import { Controller, Post, Body, Inject, HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './auth/login.dto';
import { firstValueFrom } from 'rxjs';

@ApiTags('auth')
@Controller()
export class AppController {
  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user and get JWT' })
  @ApiResponse({ status: 200, description: 'Successful login returns JWT' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    const result = await firstValueFrom(this.authClient.send({ cmd: 'login' }, loginDto));
    if (result.status === 401) {
      throw new HttpException('Unauthorized', 401);
    }
    return result;
  }
}
