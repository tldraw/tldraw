/// <reference types="node" />
import { ClientRequest } from 'http';
import type { Request } from '../types';
/**
 * Fix proxied body if bodyParser is involved.
 */
export declare function fixRequestBody(proxyReq: ClientRequest, req: Request): void;
