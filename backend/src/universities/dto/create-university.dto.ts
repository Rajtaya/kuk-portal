import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUniversityDto {
  @ApiProperty({ example: 'Kurukshetra University' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'KUK' })
  @IsString()
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, default: 'Haryana' })
  @IsOptional()
  @IsString()
  state?: string;
}
