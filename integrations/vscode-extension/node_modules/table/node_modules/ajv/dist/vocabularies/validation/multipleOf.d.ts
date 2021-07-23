import type { CodeKeywordDefinition, ErrorObject } from "../../types";
export declare type MultipleOfError = ErrorObject<"multipleOf", {
    multipleOf: number;
}, number | {
    $data: string;
}>;
declare const def: CodeKeywordDefinition;
export default def;
