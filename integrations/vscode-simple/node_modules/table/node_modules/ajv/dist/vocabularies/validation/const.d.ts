import type { CodeKeywordDefinition, ErrorObject } from "../../types";
export declare type ConstError = ErrorObject<"const", {
    allowedValue: any;
}>;
declare const def: CodeKeywordDefinition;
export default def;
