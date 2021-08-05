import { Filter, Options } from './types';
export declare type Config = {
    context: Filter;
    options: Options;
};
export declare function createConfig(context: any, opts?: Options): Config;
