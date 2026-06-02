# UEMS — Use Case Diagrams

## Actors

| Actor | Description |
|-------|-------------|
| **Super Admin** | HE Haryana — full system control, manages universities, users, master data, audit logs |
| **State User** | State-level officer — manages sanctioned posts, views all reports, read-only for employees |
| **University Admin** | University registrar — manages employees for their university, read-only for sanctioned posts |

---

## 1. Authentication

```
                    ┌─────────────────────────┐
                    │     Authentication       │
                    └─────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
      Super Admin        State User      University Admin
            │                 │                 │
            └────────┬────────┘                 │
                     ▼                          ▼
               ┌──────────┐              ┌──────────┐
               │  Login   │              │  Login   │
               └──────────┘              └──────────┘
                     │                          │
                     ▼                          ▼
              ┌─────────────┐           ┌─────────────┐
              │View Profile │           │View Profile │
              └─────────────┘           └─────────────┘
```

| Use Case |       Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| Login           | Yes | Yes | Yes |
| View Profile    | Yes | Yes | Yes |

---

## 2. University Management

```
      Super Admin
            │
            ├── Create University (name, code, city, address, state, website, email, phone, logo)
            ├── Edit University
            ├── View University List ◄── State User, University Admin (read-only)
            └── View University Stats ◄── State User, University Admin (read-only)
```

| Use Case |            Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| Create University     | Yes | No | No |
| Edit University       | Yes | No | No |
| View Universities     | Yes | Yes | Yes |
| View University Stats | Yes | Yes | Yes |

---

## 3. Employee Management

```
      University Admin
            │
            ├── Add Employee
            ├── Edit Employee
            ├── Delete Employee
            ├── Bulk Upload (Excel)
            ├── View Employee List ◄── Super Admin, State User (read-only)
            ├── View Employee Detail ◄── Super Admin, State User (read-only)
            └── Export CSV ◄── Super Admin, State User
```

| Use Case |                   Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| Add Employee                | No | No | Yes |
| Edit Employee               | No | No | Yes |
| Delete Employee             | No | No | Yes |
| Bulk Upload Excel           | No | No | Yes |
| View Employee List          | Yes (all) | Yes (all) | Yes (own university) |
| View Employee Detail        | Yes | Yes | Yes (own) |
| Export CSV                  | Yes | Yes | Yes |
| Filter (PostType, Designation, University, Category, Gender, Status) | Yes | Yes | Yes |

---

## 4. Sanctioned Posts Management

```
      Super Admin / State User
            │
            ├── Create Sanctioned Post (department, subject, designation, postType, count)
            ├── Edit Sanctioned Post
            ├── Delete Sanctioned Post
            ├── Bulk Upload (Excel)
            ├── View Sanctioned Posts ◄── University Admin (read-only)
            ├── View Vacancy Report ◄── University Admin (read-only)
            └── Export Vacancy CSV ◄── University Admin (read-only)
```

| Use Case |                  Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| Create Sanctioned Post      | Yes | Yes | No |
| Edit Sanctioned Post        | Yes | Yes | No |
| Delete Sanctioned Post      | Yes | Yes | No |
| Bulk Upload                 | Yes | Yes | No |
| View Posts                  | Yes (all) | Yes (all) | Yes (own university) |
| View Vacancy Report         | Yes | Yes | Yes (own) |
| Export Vacancy CSV          | Yes | Yes | Yes |

---

## 5. Dashboard & Charts

```
      All Actors
            │
            ├── View Dashboard Stats (total, active, budgeted, SFS, contractual, gender, retiring)
            ├── Employee Distribution Chart (stacked bar by university)
            ├── Sunburst Chart (university → department → subject drill-down)
            ├── Summary by Subject Chart
            ├── Category-wise Chart
            ├── Employment Type Chart
            ├── Gender Donut Chart
            └── Sanction vs Present Chart
```

| Use Case |            Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| View Dashboard Stats | Yes (all) | Yes (all) | Yes (own university) |
| View All Charts      | Yes (all) | Yes (all) | Yes (own university) |
| Filter by University | Yes | Yes | No (auto-filtered) |

---

## 6. Reports

```
      All Actors
            │
            ├── University-wise Report ◄── Super Admin, State User only
            ├── Department-wise Report
            ├── Subject-wise Report
            ├── Designation-wise Report
            ├── Category-wise Report
            ├── Gender-wise Report
            ├── Teaching Staff Report
            ├── Retirement Due Report
            ├── Employee Strength Report ◄── Super Admin, State User only
            └── Employee Directory
```

| Use Case |                  Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| University-wise Report      | Yes | Yes | No |
| Employee Strength Report    | Yes | Yes | No |
| All Other Reports           | Yes | Yes | Yes (own university) |

---

## 7. User Management

```
      Super Admin
            │
            ├── Create User (email, password, name, role, university)
            ├── Edit User
            ├── Toggle Active/Inactive
            └── View User List
```

| Use Case |      Super Admin | State User | University Admin |
|----------|:-:|:-:|:-:|
| Create User     | Yes | No | No |
| Edit User       | Yes | No | No |
| Toggle Inactive | Yes | No | No |
| View Users      | Yes | No | No |

---

## 8. Master Data Management

```
      Super Admin
            │
            ├── Add Subject
            ├── Delete Subject
            ├── Add Designation
            ├── Delete Designation
            ├── View Subjects ◄── All roles
            └── View Designations ◄── All roles
```

---

## 9. Department Management

```
      All Authenticated Users
            │
            ├── Create Department
            ├── Edit Department
            ├── Delete Department
            └── View Department List
```

---

## 10. Document Management

```
      All Authenticated Users
            │
            ├── Upload Document (for employee)
            ├── View Documents (for employee)
            └── Delete Document
```

---

## 11. Audit Log

```
      Super Admin
            │
            └── View Audit Logs (action, entity, user, timestamp, IP, changes)
```

---

## Complete Access Matrix

| Module |                    Super Admin | State User | University Admin |
|--------|:-:|:-:|:-:|
| **Login / Profile**               | RW | RW | RW |
| **Universities**                  | RW | R | R |
| **Employees**                     | R | R | RW (own) |
| **Sanctioned  Posts**             | RW | RW | R |
| **Dashboard / Charts**            | R (all) | R (all) | R (own) |
| **Reports**                       | R (all) | R (all) | R (own) |
| **Users**                         | RW | — | — |
| **Master Data**                   | RW | R | R |
| **Departments**                   | RW | RW | RW |
| **Documents**                     | RW | RW | RW |
| **Audit Logs**                    | R | — | — |

_RW = Read/Write, R = Read-only, — = No access_
