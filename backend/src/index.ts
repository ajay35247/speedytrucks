import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocket } from './lib/socket';
import { logger } from './lib/logger';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  await initSocket(server);

  server.listen(env.port, () => {
    logger.info({ port: env.port }, 'AP Trucking backend listening');
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error('Backend failed to start:', message);
  console.error('Stack:', stack);
  process.exit(1);
});
