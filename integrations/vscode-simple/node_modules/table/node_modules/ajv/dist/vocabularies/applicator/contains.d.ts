import type { CodeKeywordDefinition, ErrorObject, AnySchema } from "../../types";
export declare type ContainsError = ErrorObject<"contains", {
    minContains: number;
    maxContains?: number;
}, AnySchema>;
declare const def: CodeKeywordDefinition;
export default def;
