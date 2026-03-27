"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIo = getIo;
exports.emitTripLocationUpdate = emitTripLocationUpdate;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const jwt_1 = require("./jwt");
const env_1 = require("../config/env");
let io = null;
async function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: { origin: true, credentials: true },
    });
    const pubClient = (0, redis_1.createClient)({ url: env_1.env.redisUrl });
    const subClient = pubClient.duplicate();
    await pubClient.connect();
    await subClient.connect();
    io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    io.use((socket, next) => {
        try {
            const rawToken = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || '');
            const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
            if (!token)
                return next(new Error('Missing socket token'));
            const user = (0, jwt_1.verifyAccessToken)(token);
            socket.data.user = user;
            next();
        }
        catch (error) {
            next(error);
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        socket.join(`user:${user.id}`);
        socket.on('location:subscribe', (tripId) => {
            socket.join(`trip:${tripId}`);
        });
        socket.on('location:unsubscribe', (tripId) => {
            socket.leave(`trip:${tripId}`);
        });
    });
    return io;
}
function getIo() {
    return io;
}
function emitTripLocationUpdate(payload) {
    if (!io)
        return;
    io.to(`trip:${payload.tripId}`).emit('location:update', payload);
    if (payload.driverUserId)
        io.to(`user:${payload.driverUserId}`).emit('location:update', payload);
}
