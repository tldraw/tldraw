"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPathRewriter = void 0;
const isPlainObj = require("is-plain-obj");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const logger = logger_1.getInstance();
/**
 * Create rewrite function, to cache parsed rewrite rules.
 *
 * @param {Object} rewriteConfig
 * @return {Function} Function to rewrite paths; This function should accept `path` (request.url) as parameter
 */
function createPathRewriter(rewriteConfig) {
    let rulesCache;
    if (!isValidRewriteConfig(rewriteConfig)) {
        return;
    }
    if (typeof rewriteConfig === 'function') {
        const customRewriteFn = rewriteConfig;
        return customRewriteFn;
    }
    else {
        rulesCache = parsePathRewriteRules(rewriteConfig);
        return rewritePath;
    }
    function rewritePath(path) {
        let result = path;
        for (const rule of rulesCache) {
            if (rule.regex.test(path)) {
                result = result.replace(rule.regex, rule.value);
                logger.debug('[HPM] Rewriting path from "%s" to "%s"', path, result);
                break;
            }
        }
        return result;
    }
}
exports.createPathRewriter = createPathRewriter;
function isValidRewriteConfig(rewriteConfig) {
    if (typeof rewriteConfig === 'function') {
        return true;
    }
    else if (isPlainObj(rewriteConfig)) {
        return Object.keys(rewriteConfig).length !== 0;
    }
    else if (rewriteConfig === undefined || rewriteConfig === null) {
        return false;
    }
    else {
        throw new Error(errors_1.ERRORS.ERR_PATH_REWRITER_CONFIG);
    }
}
function parsePathRewriteRules(rewriteConfig) {
    const rules = [];
    if (isPlainObj(rewriteConfig)) {
        for (const [key] of Object.entries(rewriteConfig)) {
            rules.push({
                regex: new RegExp(key),
                value: rewriteConfig[key],
            });
            logger.info('[HPM] Proxy rewrite rule created: "%s" ~> "%s"', key, rewriteConfig[key]);
        }
    }
    return rules;
}
