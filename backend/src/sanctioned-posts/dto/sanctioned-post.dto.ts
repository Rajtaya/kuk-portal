import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from '@prisma/client';

export class CreateSanctionedPostDto {
  @ApiProperty() @IsString() universityId: string;
  @ApiProperty() @IsString() departmentId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() designation: string;
  @ApiProperty({ enum: Category }) @IsEnum(Category) category: Category;
  @ApiProperty() @IsInt() @Min(0) sanctionedCount: number;
}
