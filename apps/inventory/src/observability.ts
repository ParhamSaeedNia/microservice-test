import { Controller, Get, Injectable, Res, type LoggerService } from '@nestjs/common';
import { metricNames } from '@market/contracts';
import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';
import pino from 'pino';

const serviceName = 'inventory';

export interface LogFields {
  requestId?: string;
  eventId?: string;
  eventType?: string;
}

export const logContext = new AsyncLocalStorage<LogFields>();

loadEnvFiles();

export const metrics = createMetrics(serviceName);
export const nestLogger = createNestLogger(serviceName, process.env.LOG_DIR);

export function bindEvent<T>(event: { eventId: string; eventType: string }, run: () => Promise<T>): Promise<T> {
  const parent = logContext.getStore() ?? {};
  return logContext.run({ ...parent, eventId: event.eventId, eventType: event.eventType }, run);
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const stop = metrics.httpDuration.startTimer({ service: serviceName, method: req.method });
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl ?? ''}${req.route.path}` : 'unknown';
    stop({ route, status: String(res.statusCode) });
  });
  next();
}

@Controller()
@Injectable()
export class MetricsController {
  @Get('metrics')
  async metrics(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', metrics.register.contentType);
    res.send(await metrics.register.metrics());
  }
}

function createMetrics(service: string) {
  const register = new Registry();
  collectDefaultMetrics({ register });
  return {
    register,
    httpDuration: new Histogram({
      name: metricNames.httpDuration,
      help: 'HTTP request duration in seconds',
      labelNames: ['service', 'method', 'route', 'status'],
      registers: [register],
    }),
    outbox: new Counter({
      name: metricNames.outboxWritten,
      help: 'Outbox rows written',
      labelNames: ['service'],
      registers: [register],
    }),
    kafka: new Counter({
      name: metricNames.kafkaConsumed,
      help: 'Kafka messages consumed',
      labelNames: ['service', 'topic'],
      registers: [register],
    }),
    rabbit: new Counter({
      name: metricNames.rabbitConsumed,
      help: 'RabbitMQ messages consumed',
      labelNames: ['service'],
      registers: [register],
    }),
    sent: new Counter({
      name: metricNames.notificationsSent,
      help: 'Notifications stored',
      labelNames: ['service', 'kind'],
      registers: [register],
    }),
    service,
  };
}

function createNestLogger(service: string, logDir: string | undefined): LoggerService {
  const streams: pino.StreamEntry[] = [{ stream: process.stdout }];
  if (logDir) {
    mkdirSync(logDir, { recursive: true });
    streams.push({ stream: pino.destination(join(logDir, `${service}.log`)) });
  }
  const logger = pino(
    {
      base: { service },
      messageKey: 'msg',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      mixin() {
        return logContext.getStore() ?? {};
      },
    },
    pino.multistream(streams),
  );
  return {
    log(message: unknown, context?: string) {
      logger.info(extra(context), text(message));
    },
    error(message: unknown, trace?: string, context?: string) {
      logger.error({ ...extra(context), trace }, text(message));
    },
    warn(message: unknown, context?: string) {
      logger.warn(extra(context), text(message));
    },
    debug(message: unknown, context?: string) {
      logger.debug(extra(context), text(message));
    },
    verbose(message: unknown, context?: string) {
      logger.debug(extra(context), text(message));
    },
  };
}

function extra(context?: string): Record<string, string> {
  return context ? { context } : {};
}

function text(message: unknown): string {
  return typeof message === 'string' ? message : JSON.stringify(message);
}

function loadEnvFiles(): void {
  for (const path of ['.env', '../../.env']) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}
