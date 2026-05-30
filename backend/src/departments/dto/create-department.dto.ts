import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Physics' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  universityId: string;
}
