import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { HEADER_NAMES } from '../constants/app.constants';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.headers[HEADER_NAMES.REQUEST_ID] as string | undefined;

    return next.handle().pipe(
      map((data) => {
        // If data already has our response shape, pass through
        if (this.isApiResponse(data)) {
          return data as unknown as ApiResponse<T>;
        }

        return {
          success: true,
          message: this.getDefaultMessage(request.method),
          data: data ?? null,
          timestamp: new Date().toISOString(),
          ...(requestId && { requestId }),
        } as ApiResponse<T>;
      }),
    );
  }

  private isApiResponse(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      'message' in data &&
      'data' in data
    );
  }

  private getDefaultMessage(method: string): string {
    const messages: Record<string, string> = {
      GET: 'Data retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource updated successfully',
      DELETE: 'Resource deleted successfully',
    };
    return messages[method] ?? 'Operation completed successfully';
  }
}
