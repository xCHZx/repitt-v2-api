import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Café El Rincón', description: 'Business name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 3, description: 'Category ID (see GET /catalogs/categories)' })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiPropertyOptional({ example: 'El mejor café del barrio' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Av. Insurgentes 123, CDMX' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '+521234567890' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Lun-Vie 8am-8pm, Sáb 9am-3pm' })
  @IsString()
  @IsOptional()
  openingHours?: string;
}
