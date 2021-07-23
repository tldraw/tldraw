import type { CodeKeywordDefinition, ErrorObject } from "../../types";
export declare type UniqueItemsError = ErrorObject<"uniqueItems", {
    i: number;
    j: number;
}, boolean | {
    $data: string;
}>;
declare const def: CodeKeywordDefinition;
export default def;
