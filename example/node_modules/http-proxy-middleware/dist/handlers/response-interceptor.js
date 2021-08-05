"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseInterceptor = void 0;
const zlib = require("zlib");
/**
 * Intercept responses from upstream.
 * Automatically decompress (deflate, gzip, brotli).
 * Give developer the opportunity to modify intercepted Buffer and http.ServerResponse
 *
 * NOTE: must set options.selfHandleResponse=true (prevent automatic call of res.end())
 */
function responseInterceptor(interceptor) {
    return function proxyRes(proxyRes, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const originalProxyRes = proxyRes;
            let buffer = Buffer.from('', 'utf8');
            // decompress proxy response
            const _proxyRes = decompress(proxyRes, proxyRes.headers['content-encoding']);
            // concat data stream
            _proxyRes.on('data', (chunk) => (buffer = Buffer.concat([buffer, chunk])));
            _proxyRes.on('end', () => __awaiter(this, void 0, void 0, function* () {
                // copy original headers
                copyHeaders(proxyRes, res);
                // call interceptor with intercepted response (buffer)
                const interceptedBuffer = Buffer.from(yield interceptor(buffer, originalProxyRes, req, res));
                // set correct content-length (with double byte character support)
                res.setHeader('content-length', Buffer.byteLength(interceptedBuffer, 'utf8'));
                res.write(interceptedBuffer);
                res.end();
            }));
            _proxyRes.on('error', (error) => {
                res.end(`Error fetching proxied request: ${error.message}`);
            });
        });
    };
}
exports.responseInterceptor = responseInterceptor;
/**
 * Streaming decompression of proxy response
 * source: https://github.com/apache/superset/blob/9773aba522e957ed9423045ca153219638a85d2f/superset-frontend/webpack.proxy-config.js#L116
 */
function decompress(proxyRes, contentEncoding) {
    let _proxyRes = proxyRes;
    let decompress;
    switch (contentEncoding) {
        case 'gzip':
            decompress = zlib.createGunzip();
            break;
        case 'br':
            decompress = zlib.createBrotliDecompress();
            break;
        case 'deflate':
            decompress = zlib.createInflate();
            break;
        default:
            break;
    }
    if (decompress) {
        _proxyRes.pipe(decompress);
        _proxyRes = decompress;
    }
    return _proxyRes;
}
/**
 * Copy original headers
 * https://github.com/apache/superset/blob/9773aba522e957ed9423045ca153219638a85d2f/superset-frontend/webpack.proxy-config.js#L78
 */
function copyHeaders(originalResponse, response) {
    response.statusCode = originalResponse.statusCode;
    response.statusMessage = originalResponse.statusMessage;
    if (response.setHeader) {
        let keys = Object.keys(originalResponse.headers);
        // ignore chunked, brotli, gzip, deflate headers
        keys = keys.filter((key) => !['content-encoding', 'transfer-encoding'].includes(key));
        keys.forEach((key) => {
            let value = originalResponse.headers[key];
            if (key === 'set-cookie') {
                // remove cookie domain
                value = Array.isArray(value) ? value : [value];
                value = value.map((x) => x.replace(/Domain=[^;]+?/i, ''));
            }
            response.setHeader(key, value);
        });
    }
    else {
        response.headers = originalResponse.headers;
    }
}
