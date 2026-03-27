import { PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'My New Business Name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'A fresh description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '123 Fake Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '555-123-4567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'Mon-Fri 9am-5pm' })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://s3.../logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoPath?: string;
}
