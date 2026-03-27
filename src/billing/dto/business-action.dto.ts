import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class BusinessActionDto {
  @ApiProperty({ description: 'ID del negocio', example: 1 })
  @IsInt()
  businessId!: number;
}
