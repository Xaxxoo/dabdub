import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { HEADER_NAMES } from '../constants/app.constants';

interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers[HEADER_NAMES.REQUEST_ID] as string;
    const path = request.url;
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let error = 'Internal Server Error';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const obj = exceptionResponse as Record<string, unknown>;
        message = (obj['message'] as string) ?? exception.message;
        details = Array.isArray(obj['message']) ? obj['message'] : undefined;
        if (Array.isArray(obj['message']) && (obj['message'] as string[]).length > 0) {
          message = 'Validation failed';
        }
      }
      error = exception.name.replace('Exception', '');
    } else if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.CONFLICT;
      message = this.handleQueryError(exception);
      error = 'Database Error';
    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
      error = 'Not Found';
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        { requestId, path },
      );
    }

    const errorResponse: ErrorResponse = {
      success: false,
      message,
      error,
      statusCode,
      timestamp,
      path,
      ...(requestId ? { requestId } : {}),
      ...(details !== undefined ? { details } : {}),
    };

    if (statusCode >= 500) {
      this.logger.error('Server error', {
        exception: exception instanceof Error ? exception.message : exception,
        stack: exception instanceof Error ? exception.stack : undefined,
        requestId,
        path,
        statusCode,
      });
    }

    response.status(statusCode).json(errorResponse);
  }

  private handleQueryError(error: QueryFailedError): string {
    const code = (error as QueryFailedError & { code?: string }).code;

    switch (code) {
      case '23505': // unique_violation
        return 'A record with this data already exists';
      case '23503': // foreign_key_violation
        return 'Referenced resource does not exist';
      case '23502': // not_null_violation
        return 'Required field is missing';
      case '22001': // string_data_right_truncation
        return 'Data value is too long';
      default:
        this.logger.error('Database query failed', { error: error.message, code });
        return 'A database error occurred';
    }
  }
}
