/// <reference types="node" />
import type * as http from 'http';
declare type Interceptor = (buffer: Buffer, proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) => Promise<Buffer | string>;
/**
 * Intercept responses from upstream.
 * Automatically decompress (deflate, gzip, brotli).
 * Give developer the opportunity to modify intercepted Buffer and http.ServerResponse
 *
 * NOTE: must set options.selfHandleResponse=true (prevent automatic call of res.end())
 */
export declare function responseInterceptor(interceptor: Interceptor): (proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
export {};
