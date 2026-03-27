"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
async function requireAuth(req, res, next) {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing bearer token', code: 'MISSING_BEARER_TOKEN' });
    }
    try {
        const token = authorization.slice(7);
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        const [user, session] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: decoded.id } }),
            prisma_1.prisma.userSession.findUnique({ where: { sessionId: decoded.sessionId } }),
        ]);
        if (!user || user.status !== 'ACTIVE') {
            return res.status(401).json({ message: 'User is inactive or not found', code: 'AUTH_USER_INVALID' });
        }
        if (!session || session.userId !== user.id || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Session is no longer valid', code: 'SESSION_INVALID' });
        }
        await prisma_1.prisma.userSession.update({ where: { sessionId: session.sessionId }, data: { lastSeenAt: new Date() } });
        req.user = decoded;
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token', code: 'INVALID_ACCESS_TOKEN' });
    }
}
