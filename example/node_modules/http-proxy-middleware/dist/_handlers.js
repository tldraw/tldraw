"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHandlers = exports.init = void 0;
const logger_1 = require("./logger");
const logger = logger_1.getInstance();
function init(proxy, option) {
    const handlers = getHandlers(option);
    for (const eventName of Object.keys(handlers)) {
        proxy.on(eventName, handlers[eventName]);
    }
    logger.debug('[HPM] Subscribed to http-proxy events:', Object.keys(handlers));
}
exports.init = init;
function getHandlers(options) {
    // https://github.com/nodejitsu/node-http-proxy#listening-for-proxy-events
    const proxyEventsMap = {
        error: 'onError',
        proxyReq: 'onProxyReq',
        proxyReqWs: 'onProxyReqWs',
        proxyRes: 'onProxyRes',
        open: 'onOpen',
        close: 'onClose',
    };
    const handlers = {};
    for (const [eventName, onEventName] of Object.entries(proxyEventsMap)) {
        // all handlers for the http-proxy events are prefixed with 'on'.
        // loop through options and try to find these handlers
        // and add them to the handlers object for subscription in init().
        const fnHandler = options ? options[onEventName] : null;
        if (typeof fnHandler === 'function') {
            handlers[eventName] = fnHandler;
        }
    }
    // add default error handler in absence of error handler
    if (typeof handlers.error !== 'function') {
        handlers.error = defaultErrorHandler;
    }
    // add default close handler in absence of close handler
    if (typeof handlers.close !== 'function') {
        handlers.close = logClose;
    }
    return handlers;
}
exports.getHandlers = getHandlers;
function defaultErrorHandler(err, req, res) {
    // Re-throw error. Not recoverable since req & res are empty.
    if (!req && !res) {
        throw err; // "Error: Must provide a proper URL as target"
    }
    const host = req.headers && req.headers.host;
    const code = err.code;
    if (res.writeHead && !res.headersSent) {
        if (/HPE_INVALID/.test(code)) {
            res.writeHead(502);
        }
        else {
            switch (code) {
                case 'ECONNRESET':
                case 'ENOTFOUND':
                case 'ECONNREFUSED':
                case 'ETIMEDOUT':
                    res.writeHead(504);
                    break;
                default:
                    res.writeHead(500);
            }
        }
    }
    res.end(`Error occured while trying to proxy: ${host}${req.url}`);
}
function logClose(req, socket, head) {
    // view disconnected websocket connections
    logger.info('[HPM] Client disconnected');
}
