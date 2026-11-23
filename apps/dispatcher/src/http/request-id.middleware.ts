import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logContext } from '../observability.js';

export const requestIdPattern = /^[\w.-]{1,128}$/;

export type RequestWithId = Request & { id: string };

export function requestIdFrom(header: string | undefined): string {
  return header && requestIdPattern.test(header) ? header : randomUUID();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const id = requestIdFrom(req.header('x-request-id'));
    req.id = id;
    res.setHeader('X-Request-Id', id);
    logContext.run({ requestId: id }, () => next());
  }
}
