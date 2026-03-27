import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan', description: 'First name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez', description: 'Last name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '+521234567890', description: 'Phone number' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;
}
