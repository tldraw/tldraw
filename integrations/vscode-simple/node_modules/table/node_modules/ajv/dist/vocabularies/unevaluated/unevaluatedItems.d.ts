import type { CodeKeywordDefinition, ErrorObject, AnySchema } from "../../types";
export declare type UnevaluatedItemsError = ErrorObject<"unevaluatedItems", {
    limit: number;
}, AnySchema>;
declare const def: CodeKeywordDefinition;
export default def;
