"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixRequestBody = void 0;
const querystring = require("querystring");
/**
 * Fix proxied body if bodyParser is involved.
 */
function fixRequestBody(proxyReq, req) {
    if (!req.body || !Object.keys(req.body).length) {
        return;
    }
    const contentType = proxyReq.getHeader('Content-Type');
    const writeBody = (bodyData) => {
        // deepcode ignore ContentLengthInCode: bodyParser fix
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    };
    if (contentType && contentType.includes('application/json')) {
        writeBody(JSON.stringify(req.body));
    }
    if (contentType === 'application/x-www-form-urlencoded') {
        writeBody(querystring.stringify(req.body));
    }
}
exports.fixRequestBody = fixRequestBody;
