import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsInt, Min, Max, MaxLength, IsEmail, Matches, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Gender, Category, PostType, EmployeeClassification, EmploymentStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  universityId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  departmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ enum: Category, required: false })
  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @ApiProperty({ enum: Category, required: false })
  @IsOptional()
  @IsEnum(Category)
  categorySelection?: Category;

  @ApiProperty({ enum: PostType, required: false })
  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @ApiProperty({ enum: EmployeeClassification, required: false })
  @IsOptional()
  @IsEnum(EmployeeClassification)
  employeeClassification?: EmployeeClassification;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  designationAppointed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  designationPresent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  retirementDate?: string;

  @ApiProperty({ enum: EmploymentStatus, required: false })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  // Lenient phone format: digits and the usual separators, no free text.
  @Matches(/^[0-9+\-()\s]+$/, { message: 'mobileNumber contains invalid characters' })
  mobileNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

// Partial<CreateEmployeeDto> as a controller body type erases class-validator
// metadata at runtime (no validation at all); PartialType keeps every rule.
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

const SORTABLE = [
  'name', 'employeeId', 'createdAt', 'subject', 'designationAppointed', 'designationPresent',
  'retirementDate', 'gender', 'category', 'categorySelection', 'postType', 'employmentStatus',
  'university', 'universityCode',
];

export class EmployeeFilterDto {
  @IsOptional() @IsString() @MaxLength(64) universityId?: string;
  @IsOptional() @IsString() @MaxLength(64) departmentId?: string;
  @IsOptional() @IsString() @MaxLength(200) department?: string;
  @IsOptional() @IsString() @MaxLength(100) employeeId?: string;
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @IsOptional() @IsString() @MaxLength(200) designation?: string;
  @IsOptional() @IsEnum(PostType) postType?: PostType;
  @IsOptional() @IsEnum(EmployeeClassification) employeeClassification?: EmployeeClassification;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(Category) category?: Category;
  @IsOptional() @IsEnum(EmploymentStatus) employmentStatus?: EmploymentStatus;
  @IsOptional() @IsString() @MaxLength(4) retirementYear?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(SORTABLE) sortBy?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
