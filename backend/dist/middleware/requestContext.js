"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContext = requestContext;
const crypto_1 = __importDefault(require("crypto"));
function requestContext(req, res, next) {
    req.requestId = req.header('x-request-id') || crypto_1.default.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
}
