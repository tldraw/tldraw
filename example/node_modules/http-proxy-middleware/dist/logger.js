"use strict";
/* eslint-disable prefer-rest-params */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArrow = exports.getInstance = void 0;
const util = require("util");
let loggerInstance;
const defaultProvider = {
    // tslint:disable: no-console
    log: console.log,
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
};
// log level 'weight'
var LEVELS;
(function (LEVELS) {
    LEVELS[LEVELS["debug"] = 10] = "debug";
    LEVELS[LEVELS["info"] = 20] = "info";
    LEVELS[LEVELS["warn"] = 30] = "warn";
    LEVELS[LEVELS["error"] = 50] = "error";
    LEVELS[LEVELS["silent"] = 80] = "silent";
})(LEVELS || (LEVELS = {}));
function getInstance() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}
exports.getInstance = getInstance;
class Logger {
    constructor() {
        this.setLevel('info');
        this.setProvider(() => defaultProvider);
    }
    // log will log messages, regardless of logLevels
    log() {
        this.provider.log(this._interpolate.apply(null, arguments));
    }
    debug() {
        if (this._showLevel('debug')) {
            this.provider.debug(this._interpolate.apply(null, arguments));
        }
    }
    info() {
        if (this._showLevel('info')) {
            this.provider.info(this._interpolate.apply(null, arguments));
        }
    }
    warn() {
        if (this._showLevel('warn')) {
            this.provider.warn(this._interpolate.apply(null, arguments));
        }
    }
    error() {
        if (this._showLevel('error')) {
            this.provider.error(this._interpolate.apply(null, arguments));
        }
    }
    setLevel(v) {
        if (this.isValidLevel(v)) {
            this.logLevel = v;
        }
    }
    setProvider(fn) {
        if (fn && this.isValidProvider(fn)) {
            this.provider = fn(defaultProvider);
        }
    }
    isValidProvider(fnProvider) {
        const result = true;
        if (fnProvider && typeof fnProvider !== 'function') {
            throw new Error('[HPM] Log provider config error. Expecting a function.');
        }
        return result;
    }
    isValidLevel(levelName) {
        const validLevels = Object.keys(LEVELS);
        const isValid = validLevels.includes(levelName);
        if (!isValid) {
            throw new Error('[HPM] Log level error. Invalid logLevel.');
        }
        return isValid;
    }
    /**
     * Decide to log or not to log, based on the log levels 'weight'
     * @param  {String}  showLevel [debug, info, warn, error, silent]
     * @return {Boolean}
     */
    _showLevel(showLevel) {
        let result = false;
        const currentLogLevel = LEVELS[this.logLevel];
        if (currentLogLevel && currentLogLevel <= LEVELS[showLevel]) {
            result = true;
        }
        return result;
    }
    // make sure logged messages and its data are return interpolated
    // make it possible for additional log data, such date/time or custom prefix.
    _interpolate(format, ...args) {
        const result = util.format(format, ...args);
        return result;
    }
}
/**
 * -> normal proxy
 * => router
 * ~> pathRewrite
 * ≈> router + pathRewrite
 *
 * @param  {String} originalPath
 * @param  {String} newPath
 * @param  {String} originalTarget
 * @param  {String} newTarget
 * @return {String}
 */
function getArrow(originalPath, newPath, originalTarget, newTarget) {
    const arrow = ['>'];
    const isNewTarget = originalTarget !== newTarget; // router
    const isNewPath = originalPath !== newPath; // pathRewrite
    if (isNewPath && !isNewTarget) {
        arrow.unshift('~');
    }
    else if (!isNewPath && isNewTarget) {
        arrow.unshift('=');
    }
    else if (isNewPath && isNewTarget) {
        arrow.unshift('≈');
    }
    else {
        arrow.unshift('-');
    }
    return arrow.join('');
}
exports.getArrow = getArrow;
