import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine Status Code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Isolate exact error details safely
    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = exceptionResponse?.message || (exception as Error).message || 'Internal server error';
    const details = exceptionResponse?.details || null;

    // Structured informative payload output uniform interface mapping
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: exceptionResponse?.error || 'Application Error',
      message: message,
      ...(details && { details }), // Only displays detailed sub-errors if they exist
    });
  }
}