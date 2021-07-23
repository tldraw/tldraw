import type { KeywordErrorDefinition, KeywordErrorCxt, ErrorObject } from "../../types";
import { Code } from "../../compile/codegen";
export declare type _JTDTypeError<K extends string, T extends string, S> = ErrorObject<K, {
    type: T;
    nullable: boolean;
}, S>;
export declare function typeError(t: string): KeywordErrorDefinition;
export declare function typeErrorMessage({ parentSchema }: KeywordErrorCxt, t: string): string;
export declare function typeErrorParams({ parentSchema }: KeywordErrorCxt, t: string): Code;
