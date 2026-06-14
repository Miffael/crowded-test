import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'admin123', description: 'User password' })
  @IsNotEmpty()
  @MinLength(6)
  pass!: string;
}
