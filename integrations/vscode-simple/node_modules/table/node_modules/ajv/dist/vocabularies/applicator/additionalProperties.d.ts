import type { CodeKeywordDefinition, AddedKeywordDefinition, ErrorObject, AnySchema } from "../../types";
export declare type AdditionalPropertiesError = ErrorObject<"additionalProperties", {
    additionalProperty: string;
}, AnySchema>;
declare const def: CodeKeywordDefinition & AddedKeywordDefinition;
export default def;
