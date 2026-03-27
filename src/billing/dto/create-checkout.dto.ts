import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'ID del negocio a activar con esta suscripción', example: 1 })
  @IsInt()
  businessId!: number;

  @ApiPropertyOptional({ description: 'Plan ID. Actualmente solo "premium".', example: 'premium' })
  @IsOptional()
  @IsString()
  planId?: string;
}
