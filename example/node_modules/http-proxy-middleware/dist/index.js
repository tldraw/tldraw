"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProxyMiddleware = void 0;
const http_proxy_middleware_1 = require("./http-proxy-middleware");
function createProxyMiddleware(context, options) {
    const { middleware } = new http_proxy_middleware_1.HttpProxyMiddleware(context, options);
    return middleware;
}
exports.createProxyMiddleware = createProxyMiddleware;
__exportStar(require("./handlers"), exports);
