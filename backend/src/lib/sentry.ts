import * as fs from 'node:fs';
import * as path from 'node:path';

let sentry: any = null;
try {
  const file = path.join(process.cwd(), 'node_modules', '@sentry/node');
  if (fs.existsSync(file) || fs.existsSync(file + '.js') || fs.existsSync(path.join(file, 'package.json'))) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sentry = require('@sentry/node');
  }
} catch {
  sentry = null;
}

export function initSentry(dsn?: string) {
  if (!dsn || !sentry?.init) return;
  sentry.init({ dsn, tracesSampleRate: 0.2 });
}

export function captureException(error: unknown) {
  if (sentry?.captureException) sentry.captureException(error);
}
