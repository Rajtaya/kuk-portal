import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PostType } from '@prisma/client';

export class CreateSanctionedPostDto {
  @ApiProperty() @IsString() @MaxLength(64) universityId: string;
  @ApiProperty() @IsString() @MaxLength(64) departmentId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @ApiProperty() @IsString() @MaxLength(200) designation: string;
  @ApiProperty({ enum: PostType, default: 'BUDGETED' }) @IsOptional() @IsEnum(PostType) postType?: PostType;
  @ApiProperty() @IsInt() @Min(0) @Max(100000) sanctionedCount: number;
}

export class UpdateSanctionedPostDto extends PartialType(CreateSanctionedPostDto) {}
