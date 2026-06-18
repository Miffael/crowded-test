import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '../src/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserRepository: any;

  beforeEach(async () => {
    mockJwtService = { sign: jest.fn().mockReturnValue('token') };
    mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password hash if validation succeeds', async () => {
      const user = {
        email: 'admin@example.com',
        passwordHash: 'hash',
        status: 'active',
        role: 'admin',
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('admin@example.com', 'admin123');
      expect(result).toEqual({ email: 'admin@example.com', status: 'active', role: 'admin' });
    });

    it('should return null if user is blocked', async () => {
      const user = {
        email: 'admin@example.com',
        passwordHash: 'hash',
        status: 'blocked',
        role: 'admin',
      };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.validateUser('admin@example.com', 'admin123');
      expect(result).toBeNull();
    });

    it('should return null if password mismatch', async () => {
      const user = {
        email: 'admin@example.com',
        passwordHash: 'hash',
        status: 'active',
        role: 'admin',
      };
      mockUserRepository.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('admin@example.com', 'wrong');
      expect(result).toBeNull();
    });
  });
});
