import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterVisitorDto {
  @ApiProperty({ example: 'Juan' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: '+521234567890' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  phone!: string;
}
