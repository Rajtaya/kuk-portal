import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    if (method === 'GET' || !user) return next.handle();

    const action = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' }[method] || method;
    const entity = url.split('/api/')[1]?.split('/')[0] || 'unknown';

    return next.handle().pipe(
      tap((result) => {
        this.auditService.log({
          userId: user.id,
          action,
          entity,
          entityId: result?.id || request.params?.id,
          changes: method !== 'DELETE' ? body : null,
          ipAddress: request.ip,
        });
      }),
    );
  }
}
