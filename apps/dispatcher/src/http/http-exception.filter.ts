import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { requestIdFrom, type RequestWithId } from './request-id.middleware.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.id ?? requestIdFrom(request.header('x-request-id'));
    response.setHeader('X-Request-Id', requestId);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = messageOf(body, exception.message);
      const error = errorOf(body, exception.name);
      response.status(status).json({ statusCode: status, message, error, requestId });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      requestId,
    });
  }
}

function messageOf(body: unknown, fallback: string): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.map(String).join(', ');
  }
  return fallback;
}

function errorOf(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === 'string') return error;
  }
  return fallback;
}
