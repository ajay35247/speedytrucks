"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const asyncHandler_1 = require("../middleware/asyncHandler");
const validate_1 = require("../middleware/validate");
const uploads_1 = require("../lib/uploads");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const uploadIntentSchema = zod_1.z.object({
    folder: zod_1.z.enum(['rc', 'license', 'pod']),
    mimeType: zod_1.z.string().min(3).max(120),
    entityId: zod_1.z.string().min(3).max(80).optional(),
});
router.post('/intent', (0, validate_1.validateBody)(uploadIntentSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const upload = (0, uploads_1.createSignedUploadIntent)({ folder: body.folder, mimeType: body.mimeType, entityId: body.entityId, userId: req.user.id });
    return res.status(201).json({ upload });
}));
exports.default = router;
