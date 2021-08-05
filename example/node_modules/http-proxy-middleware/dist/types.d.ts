/// <reference types="node" />
import * as express from 'express';
import * as http from 'http';
import * as httpProxy from 'http-proxy';
import * as net from 'net';
export interface Request extends express.Request {
}
export interface Response extends express.Response {
}
export interface RequestHandler extends express.RequestHandler {
    upgrade?: (req: Request, socket: net.Socket, head: any) => void;
}
export declare type Filter = string | string[] | ((pathname: string, req: Request) => boolean);
export interface Options extends httpProxy.ServerOptions {
    pathRewrite?: {
        [regexp: string]: string;
    } | ((path: string, req: Request) => string) | ((path: string, req: Request) => Promise<string>);
    router?: {
        [hostOrPath: string]: httpProxy.ServerOptions['target'];
    } | ((req: Request) => httpProxy.ServerOptions['target']) | ((req: Request) => Promise<httpProxy.ServerOptions['target']>);
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
    logProvider?(provider: LogProvider): LogProvider;
    onError?(err: Error, req: Request, res: Response): void;
    onProxyRes?(proxyRes: http.IncomingMessage, req: Request, res: Response): void;
    onProxyReq?(proxyReq: http.ClientRequest, req: Request, res: Response): void;
    onProxyReqWs?(proxyReq: http.ClientRequest, req: Request, socket: net.Socket, options: httpProxy.ServerOptions, head: any): void;
    onOpen?(proxySocket: net.Socket): void;
    onClose?(res: Response, socket: net.Socket, head: any): void;
}
interface LogProvider {
    log: Logger;
    debug?: Logger;
    info?: Logger;
    warn?: Logger;
    error?: Logger;
}
declare type Logger = (...args: any[]) => void;
export {};
