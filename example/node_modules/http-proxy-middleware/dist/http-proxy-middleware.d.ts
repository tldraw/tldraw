import type { Filter, RequestHandler, Options } from './types';
export declare class HttpProxyMiddleware {
    private logger;
    private config;
    private wsInternalSubscribed;
    private serverOnCloseSubscribed;
    private proxyOptions;
    private proxy;
    private pathRewriter;
    constructor(context: Filter | Options, opts?: Options);
    middleware: RequestHandler;
    private catchUpgradeRequest;
    private handleUpgrade;
    /**
     * Determine whether request should be proxied.
     *
     * @private
     * @param  {String} context [description]
     * @param  {Object} req     [description]
     * @return {Boolean}
     */
    private shouldProxy;
    /**
     * Apply option.router and option.pathRewrite
     * Order matters:
     *    Router uses original path for routing;
     *    NOT the modified path, after it has been rewritten by pathRewrite
     * @param {Object} req
     * @return {Object} proxy options
     */
    private prepareProxyRequest;
    private applyRouter;
    private applyPathRewrite;
    private logError;
}
