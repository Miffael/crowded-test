import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && user.status !== 'blocked' && user.status !== 'deleted') {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async login(user: any) {
    const payload = { email: user.email, sub: user.userId, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
