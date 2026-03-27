import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class CreateStampCardDto {
  @ApiProperty({ example: 'Café Fidelidad' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Acumulá 10 cafés y el 11 es gratis' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10, description: 'Number of stamps required to complete the card' })
  @IsInt()
  @Min(1)
  requiredStamps!: number;

  @ApiProperty({ example: 24, description: 'Cooldown in hours between stamps' })
  @IsInt()
  @Min(0)
  requiredHours!: number;

  @ApiPropertyOptional({ example: 'Café gratis' })
  @IsString()
  @IsOptional()
  reward?: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 5, description: 'Max times a customer can complete this card. null = unlimited' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  allowedRepeats?: number;

}
