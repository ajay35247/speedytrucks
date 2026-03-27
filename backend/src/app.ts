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

function getCorsOptions(): CorsOptions {
  if (env.corsOrigin === '*') {
    return { origin: true, credentials: true };
  }

  const allowedOrigins = env.corsOrigin.split(',').map((item) => item.trim()).filter(Boolean);
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

export function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy);
  initSentry(env.sentryDsn);

  app.use(cors(getCorsOptions()));
  app.use(helmet());
  app.use(express.json({
    limit: '5mb',
    verify: (req, _res, buffer) => {
      (req as express.Request).rawBody = buffer.toString('utf8');
    },
  }));
  app.use(requestContext);
  app.use(apiLimiter);
  app.use(morgan('combined'));
  app.use(auditLog);
  app.use('/healthz', healthRoutes);
  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}
