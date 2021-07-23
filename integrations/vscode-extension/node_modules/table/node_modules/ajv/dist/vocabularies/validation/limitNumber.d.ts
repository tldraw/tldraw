import type { CodeKeywordDefinition, ErrorObject } from "../../types";
declare type Kwd = "maximum" | "minimum" | "exclusiveMaximum" | "exclusiveMinimum";
declare type Comparison = "<=" | ">=" | "<" | ">";
export declare type LimitNumberError = ErrorObject<Kwd, {
    limit: number;
    comparison: Comparison;
}, number | {
    $data: string;
}>;
declare const def: CodeKeywordDefinition;
export default def;
