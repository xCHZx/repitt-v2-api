import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  // User Details
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'john@repitt.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '+521234567890', required: false })
  @IsString()
  @IsOptional()
  userPhone?: string;

  // Business Details
  @ApiProperty({ example: 'My Awesome Cafe', required: false })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ example: 'Best coffee in town', required: false })
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @ApiProperty({
    example: 1,
    description: 'Category ID from catalogs',
    required: false,
  })
  @IsOptional()
  categoryId?: number;
}
