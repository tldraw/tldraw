import type { CodeKeywordDefinition, ErrorObject } from "../../types";
export declare type RequiredError = ErrorObject<"required", {
    missingProperty: string;
}, string[] | {
    $data: string;
}>;
declare const def: CodeKeywordDefinition;
export default def;
