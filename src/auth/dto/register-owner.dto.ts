import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterOwnerDto {
  @ApiProperty({ example: 'Juan' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'juan@negocio.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString() @MinLength(6)
  password!: string;

  @ApiProperty({ example: '+521234567890' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  phone!: string;

  // Business details
  @ApiPropertyOptional({ example: 'Mi Café' })
  @IsString() @IsOptional() @MaxLength(255)
  businessName?: string;

  @ApiPropertyOptional({ example: 'El mejor café de la ciudad' })
  @IsString() @IsOptional()
  businessDescription?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt() @Min(1) @IsOptional()
  categoryId?: number;
}
