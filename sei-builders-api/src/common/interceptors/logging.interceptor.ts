import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HEADER_NAMES } from '../constants/app.constants';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const requestId = request.headers[HEADER_NAMES.REQUEST_ID] as string;
    const userAgent = request.headers[HEADER_NAMES.USER_AGENT] as string;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const elapsed = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} ${statusCode} ${elapsed}ms`,
            { requestId, ip, userAgent, elapsed },
          );
        },
        error: (error: Error) => {
          const elapsed = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} ERROR ${elapsed}ms — ${error.message}`,
            { requestId, ip, userAgent, elapsed },
          );
        },
      }),
    );
  }
}
