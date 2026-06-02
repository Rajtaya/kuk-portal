import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
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
  providers: [PrismaService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [PrismaService],
})
export class AppModule {}
