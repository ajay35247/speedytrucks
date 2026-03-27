"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateParams = validateParams;
exports.validateQuery = validateQuery;
function validateBody(schema) {
    return (req, _res, next) => {
        req.body = schema.parse(req.body);
        next();
    };
}
function validateParams(schema) {
    return (req, _res, next) => {
        req.params = schema.parse(req.params);
        next();
    };
}
function validateQuery(schema) {
    return (req, _res, next) => {
        req.query = schema.parse(req.query);
        next();
    };
}
