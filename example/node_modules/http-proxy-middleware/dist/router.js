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
exports.getTarget = void 0;
const isPlainObj = require("is-plain-obj");
const logger_1 = require("./logger");
const logger = logger_1.getInstance();
function getTarget(req, config) {
    return __awaiter(this, void 0, void 0, function* () {
        let newTarget;
        const router = config.router;
        if (isPlainObj(router)) {
            newTarget = getTargetFromProxyTable(req, router);
        }
        else if (typeof router === 'function') {
            newTarget = yield router(req);
        }
        return newTarget;
    });
}
exports.getTarget = getTarget;
function getTargetFromProxyTable(req, table) {
    let result;
    const host = req.headers.host;
    const path = req.url;
    const hostAndPath = host + path;
    for (const [key] of Object.entries(table)) {
        if (containsPath(key)) {
            if (hostAndPath.indexOf(key) > -1) {
                // match 'localhost:3000/api'
                result = table[key];
                logger.debug('[HPM] Router table match: "%s"', key);
                break;
            }
        }
        else {
            if (key === host) {
                // match 'localhost:3000'
                result = table[key];
                logger.debug('[HPM] Router table match: "%s"', host);
                break;
            }
        }
    }
    return result;
}
function containsPath(v) {
    return v.indexOf('/') > -1;
}
