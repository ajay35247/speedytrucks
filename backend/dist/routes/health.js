"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../lib/redis");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        await (0, redis_1.ensureRedisConnected)();
        await redis_1.redis.ping();
        res.json({ status: 'ok' });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.default = router;
