import type { Options } from './types';
import type * as httpProxy from 'http-proxy';
export declare function init(proxy: httpProxy, option: Options): void;
export declare function getHandlers(options: Options): any;
