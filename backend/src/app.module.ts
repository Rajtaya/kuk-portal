import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { DdosMiddleware } from './common/middleware/ddos.middleware';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { PrismaService } from './prisma.service';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UniversitiesModule } from './universities/universities.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { SanctionedPostsModule } from './sanctioned-posts/sanctioned-posts.module';
import { MastersModule } from './masters/masters.module';
import { DocumentsModule } from './documents/documents.module';
import { AuditModule } from './audit/audit.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10000, limit: process.env.NODE_ENV === 'production' ? 15 : 500 },
      { name: 'long', ttl: 60000, limit: process.env.NODE_ENV === 'production' ? 60 : 2000 },
    ]),
    MailModule,
    AuthModule,
    UsersModule,
    UniversitiesModule,
    DepartmentsModule,
    EmployeesModule,
    SanctionedPostsModule,
    MastersModule,
    DocumentsModule,
    AuditModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DdosMiddleware).forRoutes('*')
      .apply(CsrfMiddleware).forRoutes('*');
  }
}
