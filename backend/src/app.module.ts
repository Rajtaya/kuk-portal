import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UniversitiesModule } from './universities/universities.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { SanctionedPostsModule } from './sanctioned-posts/sanctioned-posts.module';
import { MastersModule } from './masters/masters.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    UniversitiesModule,
    DepartmentsModule,
    EmployeesModule,
    SanctionedPostsModule,
    MastersModule,
    DocumentsModule,
    ReportsModule,
    AuditModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
