import { IsString } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Physics' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  universityId: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
