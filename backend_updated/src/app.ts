import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { requestContext } from './middleware/requestContext';
import { auditLog } from './middleware/auditLog';
import { initSentry } from './lib/sentry';
import healthRoutes from './routes/health';
import { logger } from './lib/logger';

function getAllowedOrigins(raw: string) {
  if (raw === '*') return ['*'];
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function getCorsOptions(): CorsOptions {
  if (env.corsOrigin === '*') {
    if (env.isProduction) {
      throw new Error('CORS_ORIGIN cannot be * in production');
    }
    return { origin: true, credentials: true };
  }

  const allowedOrigins = getAllowedOrigins(env.corsOrigin);
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  };
}

morgan.token('request-id', (req) => req.requestId || '-');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);
  initSentry(env.sentryDsn);

  app.use(cors(getCorsOptions()));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({
    limit: '5mb',
    verify: (req, _res, buffer) => {
      (req as express.Request).rawBody = buffer.toString('utf8');
    },
  }));
  app.use(requestContext);
  app.use(apiLimiter);
  app.use(morgan(':method :url :status :response-time ms req_id=:request-id', {
    stream: {
      write: (message) => logger.info({ http: message.trim() }, 'HTTP request'),
    },
  }));
  app.use(auditLog);
  app.use('/healthz', healthRoutes);
  app.use('/readyz', healthRoutes);
  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}
