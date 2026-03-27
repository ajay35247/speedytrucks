"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const app_1 = require("./app");
const env_1 = require("./config/env");
const socket_1 = require("./lib/socket");
const logger_1 = require("./lib/logger");
async function main() {
    const app = (0, app_1.createApp)();
    const server = node_http_1.default.createServer(app);
    await (0, socket_1.initSocket)(server);
    server.listen(env_1.env.port, () => {
        logger_1.logger.info({ port: env_1.env.port }, 'AP Trucking backend listening');
    });
}
main().catch((error) => {
    logger_1.logger.error({ error }, 'Backend failed to start');
    process.exit(1);
});
