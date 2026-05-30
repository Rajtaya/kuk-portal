export type Role = 'SUPER_ADMIN' | 'STATE_USER' | 'UNIVERSITY_ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type Category = 'GENERAL' | 'SC' | 'ST' | 'OBC' | 'EWS' | 'BCA' | 'BCB' | 'PWD' | 'ESM';
export type PostType = 'BUDGETED' | 'SFS' | 'CONTRACTUAL';
export type EmployeeClassification = 'TEACHING';
export type EmploymentStatus = 'ACTIVE' | 'RETIRED' | 'RESIGNED' | 'TERMINATED' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  university?: University;
}

export interface University {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  _count?: { employees: number; departments: number };
}

export interface Department {
  id: string;
  name: string;
  universityId: string;
  university?: University;
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  employeeId?: string;
  name: string;
  gender: Gender;
  universityId: string;
  university?: University;
  departmentId: string;
  department?: Department;
  subject?: string;
  category: Category;
  categorySelection: Category;
  postType: PostType;
  employeeClassification: EmployeeClassification;
  designationAppointed?: string;
  designationPresent?: string;
  dateOfJoining?: string;
  retirementDate?: string;
  employmentStatus: EmploymentStatus;
  mobileNumber?: string;
  email?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  total: number;
  active: number;
  teaching: number;


  budgeted: number;
  sfs: number;
  contractual: number;
  gender: { male: number; female: number };
  retiringThisYear: number;
  sanctioned: number;
  filled: number;
  vacancies: number;
  universityCount?: number;
}
