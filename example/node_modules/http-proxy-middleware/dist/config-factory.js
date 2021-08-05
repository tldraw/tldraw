"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfig = void 0;
const isPlainObj = require("is-plain-obj");
const url = require("url");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const logger = logger_1.getInstance();
function createConfig(context, opts) {
    // structure of config object to be returned
    const config = {
        context: undefined,
        options: {},
    };
    // app.use('/api', proxy({target:'http://localhost:9000'}));
    if (isContextless(context, opts)) {
        config.context = '/';
        config.options = Object.assign(config.options, context);
        // app.use('/api', proxy('http://localhost:9000'));
        // app.use(proxy('http://localhost:9000/api'));
    }
    else if (isStringShortHand(context)) {
        const oUrl = url.parse(context);
        const target = [oUrl.protocol, '//', oUrl.host].join('');
        config.context = oUrl.pathname || '/';
        config.options = Object.assign(config.options, { target }, opts);
        if (oUrl.protocol === 'ws:' || oUrl.protocol === 'wss:') {
            config.options.ws = true;
        }
        // app.use('/api', proxy({target:'http://localhost:9000'}));
    }
    else {
        config.context = context;
        config.options = Object.assign(config.options, opts);
    }
    configureLogger(config.options);
    if (!config.options.target && !config.options.router) {
        throw new Error(errors_1.ERRORS.ERR_CONFIG_FACTORY_TARGET_MISSING);
    }
    return config;
}
exports.createConfig = createConfig;
/**
 * Checks if a String only target/config is provided.
 * This can be just the host or with the optional path.
 *
 * @example
 *      app.use('/api', proxy('http://localhost:9000'));
 *      app.use(proxy('http://localhost:9000/api'));
 *
 * @param  {String}  context [description]
 * @return {Boolean}         [description]
 */
function isStringShortHand(context) {
    if (typeof context === 'string') {
        return !!url.parse(context).host;
    }
}
/**
 * Checks if a Object only config is provided, without a context.
 * In this case the all paths will be proxied.
 *
 * @example
 *     app.use('/api', proxy({target:'http://localhost:9000'}));
 *
 * @param  {Object}  context [description]
 * @param  {*}       opts    [description]
 * @return {Boolean}         [description]
 */
function isContextless(context, opts) {
    return isPlainObj(context) && (opts == null || Object.keys(opts).length === 0);
}
function configureLogger(options) {
    if (options.logLevel) {
        logger.setLevel(options.logLevel);
    }
    if (options.logProvider) {
        logger.setProvider(options.logProvider);
    }
}
