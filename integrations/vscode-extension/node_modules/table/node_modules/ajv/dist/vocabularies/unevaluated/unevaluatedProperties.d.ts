import type { CodeKeywordDefinition, ErrorObject, AnySchema } from "../../types";
export declare type UnevaluatedPropertiesError = ErrorObject<"unevaluatedProperties", {
    unevaluatedProperty: string;
}, AnySchema>;
declare const def: CodeKeywordDefinition;
export default def;
