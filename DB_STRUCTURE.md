# UEMS Database Structure

## Tables Overview

| Table | Rows | Purpose |
|---|---|---|
| `universities` | 12 | Master list of universities |
| `users` | 14 | Login accounts (admins) |
| `departments` | 290 | Departments per university |
| `employees` | 1,328 | Employee records |
| `sanctioned_posts` | 739 | Approved post counts per dept |
| `documents` | 0 | Employee documents/files |
| `audit_logs` | 0 | Action history |
| `subjects` | 57 | Master subject list |
| `designations` | 4 | Master designation list |

---

## universities

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `name` | text | NOT NULL | Unique |
| `code` | text | NOT NULL | Unique (e.g. KUK, MDU) |
| `address` | text | nullable | |
| `city` | text | nullable | |
| `state` | text | nullable | Default: `Haryana` |
| `email` | text | nullable | |
| `phone` | text | nullable | |
| `website` | text | nullable | |
| `logoUrl` | text | nullable | |
| `createdAt` | timestamp | NOT NULL | Auto |
| `updatedAt` | timestamp | NOT NULL | |

---

## users

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `email` | text | NOT NULL | Unique |
| `password` | text | NOT NULL | bcrypt hash |
| `name` | text | NOT NULL | |
| `role` | Role | NOT NULL | `SUPER_ADMIN` · `STATE_USER` · `UNIVERSITY_ADMIN` |
| `universityId` | text | nullable | FK → universities |
| `isActive` | boolean | NOT NULL | Default: `true` |
| `createdAt` | timestamp | NOT NULL | Auto |
| `updatedAt` | timestamp | NOT NULL | |

---

## departments

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `name` | text | NOT NULL | Unique per university |
| `universityId` | text | NOT NULL | FK → universities |
| `createdAt` | timestamp | NOT NULL | Auto |
| `updatedAt` | timestamp | NOT NULL | |

---

## employees

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `employeeId` | text | nullable | Unique |
| `name` | text | NOT NULL | |
| `gender` | Gender | NOT NULL | `MALE` · `FEMALE` · `OTHER` |
| `universityId` | text | NOT NULL | FK → universities |
| `departmentId` | text | NOT NULL | FK → departments |
| `subject` | text | nullable | |
| `category` | Category | NOT NULL | Default: `GENERAL` |
| `categorySelection` | Category | NOT NULL | Default: `GENERAL` |
| `postType` | PostType | NOT NULL | `BUDGETED` · `SFS` · `CONTRACTUAL` |
| `employeeClassification` | EmployeeClassification | NOT NULL | `TEACHING` |
| `designationAppointed` | text | nullable | Designation at joining |
| `designationPresent` | text | nullable | Current designation |
| `dateOfJoining` | timestamp | nullable | |
| `retirementDate` | timestamp | nullable | |
| `employmentStatus` | EmploymentStatus | NOT NULL | Default: `ACTIVE` |
| `mobileNumber` | text | nullable | |
| `email` | text | nullable | |
| `photoUrl` | text | nullable | |
| `createdAt` | timestamp | NOT NULL | Auto |
| `updatedAt` | timestamp | NOT NULL | |

---

## sanctioned_posts

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `universityId` | text | NOT NULL | FK → universities |
| `departmentId` | text | NOT NULL | FK → departments |
| `designation` | text | NOT NULL | e.g. Professor |
| `subject` | text | nullable | Optional subject filter |
| `postType` | PostType | NOT NULL | `BUDGETED` · `SFS` · `CONTRACTUAL` |
| `sanctionedCount` | integer | NOT NULL | Default: `0` |
| `createdAt` | timestamp | NOT NULL | Auto |
| `updatedAt` | timestamp | NOT NULL | |

> **Unique constraint:** `universityId + departmentId + designation + subject + postType`

---

## documents

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `employeeId` | text | NOT NULL | FK → employees (cascade delete) |
| `type` | DocumentType | NOT NULL | `APPOINTMENT_LETTER` · `QUALIFICATION_CERTIFICATE` · `SERVICE_BOOK` · `OTHER` |
| `fileName` | text | NOT NULL | |
| `fileUrl` | text | NOT NULL | |
| `fileSize` | integer | nullable | |
| `mimeType` | text | nullable | |
| `createdAt` | timestamp | NOT NULL | Auto |

---

## audit_logs

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `userId` | text | NOT NULL | FK → users |
| `action` | text | NOT NULL | e.g. CREATE, UPDATE, DELETE |
| `entity` | text | NOT NULL | Table name affected |
| `entityId` | text | nullable | Affected record ID |
| `changes` | jsonb | nullable | Before/after values |
| `ipAddress` | text | nullable | |
| `createdAt` | timestamp | NOT NULL | Auto |

---

## subjects *(master)*

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `name` | text | NOT NULL | Unique |
| `createdAt` | timestamp | NOT NULL | Auto |

---

## designations *(master)*

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text | NOT NULL | Primary Key |
| `name` | text | NOT NULL | Unique |
| `createdAt` | timestamp | NOT NULL | Auto |

---

## Enums

| Enum | Values |
|---|---|
| `Role` | `SUPER_ADMIN` · `STATE_USER` · `UNIVERSITY_ADMIN` |
| `PostType` | `BUDGETED` · `SFS` · `CONTRACTUAL` |
| `EmploymentStatus` | `ACTIVE` · `RETIRED` · `RESIGNED` · `TERMINATED` · `SUSPENDED` |
| `EmployeeClassification` | `TEACHING` |
| `Gender` | `MALE` · `FEMALE` · `OTHER` |
| `Category` | `GENERAL` · `SC` · `ST` · `EWS` · `BCA` · `BCB` · `PWD` · `ESM` |
| `DocumentType` | `APPOINTMENT_LETTER` · `QUALIFICATION_CERTIFICATE` · `SERVICE_BOOK` · `OTHER` |

---

## Foreign Key Relationships

```
universities
  ├── users.universityId
  ├── departments.universityId
  ├── employees.universityId
  └── sanctioned_posts.universityId

departments
  ├── employees.departmentId
  └── sanctioned_posts.departmentId

employees
  └── documents.employeeId

users
  └── audit_logs.userId
```
