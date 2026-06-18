import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'login' })
  async handleLogin(@Payload() data: { email: string; pass: string }) {
    const user = await this.authService.validateUser(data.email, data.pass);
    if (!user) {
      return { status: 401, message: 'Unauthorized' };
    }
    return this.authService.login(user);
  }
}
