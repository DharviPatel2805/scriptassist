import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception instanceof Error ? exception.message : 'Internal server error',
    };

    // Log error with context
    this.logger.error(
      `Error occurred: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : '',
      {
        path: request.url,
        method: request.method,
        statusCode: status,
        userId: request.user ? (request.user as any).id : undefined,
      },
    );

    response.status(status).json(errorResponse);
  }
}
