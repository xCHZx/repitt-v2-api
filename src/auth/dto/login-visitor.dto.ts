import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginVisitorDto {
  @ApiProperty({ example: '+521234567890' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  phone!: string;
}
