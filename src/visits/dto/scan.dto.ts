import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ScanDto {
  @ApiPropertyOptional({ description: 'User personal repitt code (11 chars). Requires stampCardId.' })
  @IsOptional()
  @IsString()
  userRepittCode?: string;

  @ApiPropertyOptional({ description: 'Stamp card ID. Required when using userRepittCode.' })
  @IsOptional()
  @IsInt()
  stampCardId?: number;

  @ApiPropertyOptional({ description: 'User stamp card repitt code (15 chars). Self-contained, no stampCardId needed.' })
  @IsOptional()
  @IsString()
  userStampCardRepittCode?: string;

  @ApiPropertyOptional({ description: 'Visitor phone number. Requires stampCardId.' })
  @IsOptional()
  @IsString()
  phone?: string;
}
