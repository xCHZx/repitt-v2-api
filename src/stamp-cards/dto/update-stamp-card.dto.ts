import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateStampCardDto {
  @ApiPropertyOptional({ example: 'Café Fidelidad' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Acumulá 10 cafés y el 11 es gratis' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  requiredStamps?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsInt()
  @Min(0)
  @IsOptional()
  requiredHours?: number;

  @ApiPropertyOptional({ example: 'Café gratis' })
  @IsString()
  @IsOptional()
  reward?: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

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
