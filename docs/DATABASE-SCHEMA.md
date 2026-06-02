# UEMS — Database Schema

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│     User     │       │    University     │       │    Department     │
├──────────────┤       ├──────────────────┤       ├───────────────────┤
│ id        PK │       │ id            PK │◄──┐   │ id             PK │
│ email     UQ │       │ name          UQ │   │   │ name              │
│ password     │       │ code          UQ │   │   │ universityId   FK │──┐
│ name         │       │ address          │   │   │ createdAt         │  │
│ role      EN │       │ city             │   │   │ updatedAt         │  │
│ universityId FK│──┐  │ state            │   │   │                   │  │
│ isActive     │   │   │ website          │   │   │ UQ(name, uniId)   │  │
│ createdAt    │   │   │ email            │   │   └───────────────────┘  │
│ updatedAt    │   │   │ phone            │   │             ▲            │
└──────────────┘   │   │ logoUrl          │   │             │            │
                   │   │ createdAt        │   │             │            │
                   │   │ updatedAt        │   │             │            │
                   │   └──────────────────┘   │             │            │
                   │             ▲             │             │            │
                   └─────────────┘             │             │            │
                                               │             │            │
┌──────────────────────────────────────────────┘             │            │
│                                                            │            │
│   ┌──────────────────────────┐                             │            │
│   │       Employee           │                             │            │
│   ├──────────────────────────┤                             │            │
│   │ id                    PK │                             │            │
│   │ employeeId            UQ │                             │            │
│   │ name                     │                             │            │
│   │ gender                EN │                             │            │
│   │ universityId          FK │─────────────────────────────┘            │
│   │ departmentId          FK │──────────────────────────────────────────┘
│   │ subject                  │
│   │ category              EN │
│   │ categorySelection     EN │
│   │ postType              EN │
│   │ employeeClassification EN│
│   │ designationAppointed     │
│   │ designationPresent       │
│   │ dateOfJoining            │
│   │ retirementDate           │
│   │ employmentStatus      EN │
│   │ mobileNumber             │
│   │ email                    │
│   │ createdAt                │
│   │ updatedAt                │
│   └──────────────────────────┘
│               │
│               │ 1:N
│               ▼
│   ┌──────────────────────────┐
│   │       Document           │
│   ├──────────────────────────┤
│   │ id                    PK │
│   │ employeeId            FK │  (CASCADE delete)
│   │ type                  EN │
│   │ fileName                 │
│   │ fileUrl                  │
│   │ fileSize                 │
│   │ mimeType                 │
│   │ createdAt                │
│   └──────────────────────────┘
│
│   ┌──────────────────────────┐
│   │    SanctionedPost        │
│   ├──────────────────────────┤
│   │ id                    PK │
│   │ universityId          FK │─── University
│   │ departmentId          FK │─── Department
│   │ subject                  │
│   │ designation              │
│   │ postType              EN │
│   │ sanctionedCount          │
│   │ createdAt                │
│   │ updatedAt                │
│   │                          │
│   │ UQ(uniId, deptId,        │
│   │    designation, subject,  │
│   │    postType)              │
│   └──────────────────────────┘
│
│   ┌──────────────────────────┐
│   │       AuditLog           │
│   ├──────────────────────────┤
│   │ id                    PK │
│   │ userId                FK │─── User
│   │ action                   │
│   │ entity                   │
│   │ entityId                 │
│   │ changes             JSON │
│   │ ipAddress                │
│   │ createdAt                │
│   └──────────────────────────┘

┌──────────────┐     ┌──────────────┐
│   Subject    │     │ Designation  │
├──────────────┤     ├──────────────┤
│ id        PK │     │ id        PK │
│ name      UQ │     │ name      UQ │
│ createdAt    │     │ createdAt    │
└──────────────┘     └──────────────┘
```

---

## Tables Detail

### 1. users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | Unique identifier |
| email | String | UNIQUE | Login email |
| password | String | NOT NULL | Bcrypt hashed password |
| name | String | NOT NULL | Display name |
| role | Role | NOT NULL | SUPER_ADMIN, STATE_USER, UNIVERSITY_ADMIN |
| universityId | String | FK → universities.id, NULL | Linked university (for UNIVERSITY_ADMIN) |
| isActive | Boolean | DEFAULT true | Account active status |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime | Auto-updated | |

### 2. universities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | |
| name | String | UNIQUE, NOT NULL | Full university name |
| code | String | UNIQUE, NOT NULL | Short code (e.g. KUK, MDU) |
| address | String | NULL | Street address |
| city | String | NULL | City name |
| state | String | DEFAULT "Haryana" | State |
| website | String | NULL | Official website URL |
| email | String | NULL | Contact email |
| phone | String | NULL | Contact phone |
| logoUrl | String | NULL | Logo image URL or path |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime | Auto-updated | |

### 3. departments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | |
| name | String | NOT NULL | Department name |
| universityId | String | FK → universities.id | Parent university |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime | Auto-updated | |

**Unique:** (name, universityId)

### 4. employees

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | |
| employeeId | String | UNIQUE, NULL | University-assigned ID |
| name | String | NOT NULL | Full name |
| gender | Gender | NOT NULL | MALE, FEMALE, OTHER |
| universityId | String | FK → universities.id | |
| departmentId | String | FK → departments.id | |
| subject | String | NULL | Teaching subject |
| category | Category | DEFAULT GENERAL | Reservation category |
| categorySelection | Category | DEFAULT GENERAL | Selection category |
| postType | PostType | DEFAULT BUDGETED | BUDGETED, SFS, CONTRACTUAL |
| employeeClassification | EmployeeClassification | DEFAULT TEACHING | TEACHING |
| designationAppointed | String | NULL | Designation at appointment |
| designationPresent | String | NULL | Current designation |
| dateOfJoining | DateTime | NULL | Joining date |
| retirementDate | DateTime | NULL | Retirement date |
| employmentStatus | EmploymentStatus | DEFAULT ACTIVE | ACTIVE, RETIRED, RESIGNED, TERMINATED, SUSPENDED |
| mobileNumber | String | NULL | Phone number |
| email | String | NULL | Email address |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime | Auto-updated | |

**Indexes:** universityId, departmentId, postType, employeeClassification, employmentStatus, retirementDate

### 5. sanctioned_posts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | |
| universityId | String | FK → universities.id | |
| departmentId | String | FK → departments.id | |
| subject | String | NULL | Subject name |
| designation | String | NOT NULL | Professor, Assoc Prof, etc. |
| postType | PostType | DEFAULT BUDGETED | BUDGETED, SFS, CONTRACTUAL |
| sanctionedCount | Int | DEFAULT 0 | Number of sanctioned positions |
| createdAt | DateTime | DEFAULT now() | |
| updatedAt | DateTime | Auto-updated | |

**Unique:** (universityId, departmentId, designation, subject, postType)
**Index:** universityId

### 6. documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | |
| employeeId | String | FK → employees.id, CASCADE | |
| type | DocumentType | NOT NULL | APPOINTMENT_LETTER, QUALIFICATION_CERTIFICATE, SERVICE_BOOK, OTHER |
| fileName | String | NOT NULL | Original file name |
| fileUrl | String | NOT NULL | Storage path/URL |
| fileSize | Int | NULL | File size in bytes |
| mimeType | String | NULL | MIME type |
| createdAt | DateTime | DEFAULT now() | |

### 7. audit_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String | PK, cuid | |
| userId | String | FK → users.id | Who performed the action |
| action | String | NOT NULL | CREATE, UPDATE, DELETE, etc. |
| entity | String | NOT NULL | Table/entity name |
| entityId | String | NULL | ID of affected record |
| changes | JSON | NULL | Before/after values |
| ipAddress | String | NULL | Client IP address |
| createdAt | DateTime | DEFAULT now() | |

**Indexes:** userId, (entity, entityId), createdAt

### 8. subjects (master)

| Column | Type | Constraints |
|--------|------|-------------|
| id | String | PK, cuid |
| name | String | UNIQUE |
| createdAt | DateTime | DEFAULT now() |

### 9. designations (master)

| Column | Type | Constraints |
|--------|------|-------------|
| id | String | PK, cuid |
| name | String | UNIQUE |
| createdAt | DateTime | DEFAULT now() |

---

## Enums

| Enum | Values |
|------|--------|
| **Role** | SUPER_ADMIN, STATE_USER, UNIVERSITY_ADMIN |
| **Gender** | MALE, FEMALE, OTHER |
| **Category** | GENERAL, SC, ST, OBC, EWS, BCA, BCB, PWD, ESM |
| **PostType** | BUDGETED, SFS, CONTRACTUAL |
| **EmployeeClassification** | TEACHING |
| **EmploymentStatus** | ACTIVE, RETIRED, RESIGNED, TERMINATED, SUSPENDED |
| **DocumentType** | APPOINTMENT_LETTER, QUALIFICATION_CERTIFICATE, SERVICE_BOOK, OTHER |

---

## Relationships

| From | To | Type | FK Column | On Delete |
|------|----|------|-----------|-----------|
| User → University | N:1 | universityId | SET NULL |
| Department → University | N:1 | universityId | RESTRICT |
| Employee → University | N:1 | universityId | RESTRICT |
| Employee → Department | N:1 | departmentId | RESTRICT |
| Document → Employee | N:1 | employeeId | CASCADE |
| SanctionedPost → University | N:1 | universityId | RESTRICT |
| SanctionedPost → Department | N:1 | departmentId | RESTRICT |
| AuditLog → User | N:1 | userId | RESTRICT |

---

## Stats (as of 2026-06-02)

| Table | Rows |
|-------|------|
| universities | 12 |
| employees | 1,328 |
| sanctioned_posts | ~430 |
| departments | ~60 |
| users | ~14 |
