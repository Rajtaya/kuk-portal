import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Gender, Category, PostType, EmployeeClassification, EmploymentStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty()
  @IsString()
  universityId: string;

  @ApiProperty()
  @IsString()
  departmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
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
  designationAppointed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
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
  mobileNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;
}

// Partial<CreateEmployeeDto> as a controller body type erases class-validator
// metadata at runtime (no validation at all); PartialType keeps every rule.
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class EmployeeFilterDto {
  @IsOptional() @IsString() universityId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsEnum(PostType) postType?: PostType;
  @IsOptional() @IsEnum(EmployeeClassification) employeeClassification?: EmployeeClassification;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(Category) category?: Category;
  @IsOptional() @IsEnum(EmploymentStatus) employmentStatus?: EmploymentStatus;
  @IsOptional() @IsString() retirementYear?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortOrder?: 'asc' | 'desc';
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
