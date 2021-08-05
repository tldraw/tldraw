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
exports.HttpProxyMiddleware = void 0;
const httpProxy = require("http-proxy");
const config_factory_1 = require("./config-factory");
const contextMatcher = require("./context-matcher");
const handlers = require("./_handlers");
const logger_1 = require("./logger");
const PathRewriter = require("./path-rewriter");
const Router = require("./router");
class HttpProxyMiddleware {
    constructor(context, opts) {
        this.logger = logger_1.getInstance();
        this.wsInternalSubscribed = false;
        this.serverOnCloseSubscribed = false;
        // https://github.com/Microsoft/TypeScript/wiki/'this'-in-TypeScript#red-flags-for-this
        this.middleware = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (this.shouldProxy(this.config.context, req)) {
                try {
                    const activeProxyOptions = yield this.prepareProxyRequest(req);
                    this.proxy.web(req, res, activeProxyOptions);
                }
                catch (err) {
                    next(err);
                }
            }
            else {
                next();
            }
            /**
             * Get the server object to subscribe to server events;
             * 'upgrade' for websocket and 'close' for graceful shutdown
             *
             * NOTE:
             * req.socket: node >= 13
             * req.connection: node < 13 (Remove this when node 12/13 support is dropped)
             */
            const server = (_b = ((_a = req.socket) !== null && _a !== void 0 ? _a : req.connection)) === null || _b === void 0 ? void 0 : _b.server;
            if (server && !this.serverOnCloseSubscribed) {
                server.on('close', () => {
                    this.logger.info('[HPM] server close signal received: closing proxy server');
                    this.proxy.close();
                });
                this.serverOnCloseSubscribed = true;
            }
            if (this.proxyOptions.ws === true) {
                // use initial request to access the server object to subscribe to http upgrade event
                this.catchUpgradeRequest(server);
            }
        });
        this.catchUpgradeRequest = (server) => {
            if (!this.wsInternalSubscribed) {
                server.on('upgrade', this.handleUpgrade);
                // prevent duplicate upgrade handling;
                // in case external upgrade is also configured
                this.wsInternalSubscribed = true;
            }
        };
        this.handleUpgrade = (req, socket, head) => __awaiter(this, void 0, void 0, function* () {
            if (this.shouldProxy(this.config.context, req)) {
                const activeProxyOptions = yield this.prepareProxyRequest(req);
                this.proxy.ws(req, socket, head, activeProxyOptions);
                this.logger.info('[HPM] Upgrading to WebSocket');
            }
        });
        /**
         * Determine whether request should be proxied.
         *
         * @private
         * @param  {String} context [description]
         * @param  {Object} req     [description]
         * @return {Boolean}
         */
        this.shouldProxy = (context, req) => {
            const path = req.originalUrl || req.url;
            return contextMatcher.match(context, path, req);
        };
        /**
         * Apply option.router and option.pathRewrite
         * Order matters:
         *    Router uses original path for routing;
         *    NOT the modified path, after it has been rewritten by pathRewrite
         * @param {Object} req
         * @return {Object} proxy options
         */
        this.prepareProxyRequest = (req) => __awaiter(this, void 0, void 0, function* () {
            // https://github.com/chimurai/http-proxy-middleware/issues/17
            // https://github.com/chimurai/http-proxy-middleware/issues/94
            req.url = req.originalUrl || req.url;
            // store uri before it gets rewritten for logging
            const originalPath = req.url;
            const newProxyOptions = Object.assign({}, this.proxyOptions);
            // Apply in order:
            // 1. option.router
            // 2. option.pathRewrite
            yield this.applyRouter(req, newProxyOptions);
            yield this.applyPathRewrite(req, this.pathRewriter);
            // debug logging for both http(s) and websockets
            if (this.proxyOptions.logLevel === 'debug') {
                const arrow = logger_1.getArrow(originalPath, req.url, this.proxyOptions.target, newProxyOptions.target);
                this.logger.debug('[HPM] %s %s %s %s', req.method, originalPath, arrow, newProxyOptions.target);
            }
            return newProxyOptions;
        });
        // Modify option.target when router present.
        this.applyRouter = (req, options) => __awaiter(this, void 0, void 0, function* () {
            let newTarget;
            if (options.router) {
                newTarget = yield Router.getTarget(req, options);
                if (newTarget) {
                    this.logger.debug('[HPM] Router new target: %s -> "%s"', options.target, newTarget);
                    options.target = newTarget;
                }
            }
        });
        // rewrite path
        this.applyPathRewrite = (req, pathRewriter) => __awaiter(this, void 0, void 0, function* () {
            if (pathRewriter) {
                const path = yield pathRewriter(req.url, req);
                if (typeof path === 'string') {
                    req.url = path;
                }
                else {
                    this.logger.info('[HPM] pathRewrite: No rewritten path found. (%s)', req.url);
                }
            }
        });
        this.logError = (err, req, res, target) => {
            var _a;
            const hostname = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.host) || req.hostname || req.host; // (websocket) || (node0.10 || node 4/5)
            const requestHref = `${hostname}${req.url}`;
            const targetHref = `${target === null || target === void 0 ? void 0 : target.href}`; // target is undefined when websocket errors
            const errorMessage = '[HPM] Error occurred while proxying request %s to %s [%s] (%s)';
            const errReference = 'https://nodejs.org/api/errors.html#errors_common_system_errors'; // link to Node Common Systems Errors page
            this.logger.error(errorMessage, requestHref, targetHref, err.code || err, errReference);
        };
        this.config = config_factory_1.createConfig(context, opts);
        this.proxyOptions = this.config.options;
        // create proxy
        this.proxy = httpProxy.createProxyServer({});
        this.logger.info(`[HPM] Proxy created: ${this.config.context}  -> ${this.proxyOptions.target}`);
        this.pathRewriter = PathRewriter.createPathRewriter(this.proxyOptions.pathRewrite); // returns undefined when "pathRewrite" is not provided
        // attach handler to http-proxy events
        handlers.init(this.proxy, this.proxyOptions);
        // log errors for debug purpose
        this.proxy.on('error', this.logError);
        // https://github.com/chimurai/http-proxy-middleware/issues/19
        // expose function to upgrade externally
        this.middleware.upgrade = (req, socket, head) => {
            if (!this.wsInternalSubscribed) {
                this.handleUpgrade(req, socket, head);
            }
        };
    }
}
exports.HttpProxyMiddleware = HttpProxyMiddleware;
