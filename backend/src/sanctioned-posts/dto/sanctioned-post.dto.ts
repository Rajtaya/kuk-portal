import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostType } from '@prisma/client';

export class CreateSanctionedPostDto {
  @ApiProperty() @IsString() universityId: string;
  @ApiProperty() @IsString() departmentId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() subject?: string;
  @ApiProperty() @IsString() designation: string;
  @ApiProperty({ enum: PostType, default: 'BUDGETED' }) @IsOptional() @IsEnum(PostType) postType?: PostType;
  @ApiProperty() @IsInt() @Min(0) sanctionedCount: number;
}
