import type { CodeKeywordDefinition, ErrorObject } from "../../types";
export declare type FormatError = ErrorObject<"format", {
    format: string;
}, string | {
    $data: string;
}>;
declare const def: CodeKeywordDefinition;
export default def;
