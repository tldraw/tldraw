import type { AddedKeywordDefinition } from "../types";
declare const _jsonTypes: readonly ["string", "number", "integer", "boolean", "null", "object", "array"];
export declare type JSONType = typeof _jsonTypes[number];
export declare function isJSONType(x: unknown): x is JSONType;
declare type ValidationTypes = {
    [K in JSONType]: boolean | RuleGroup | undefined;
};
export interface ValidationRules {
    rules: RuleGroup[];
    post: RuleGroup;
    all: {
        [Key in string]?: boolean | Rule;
    };
    keywords: {
        [Key in string]?: boolean;
    };
    types: ValidationTypes;
}
export interface RuleGroup {
    type?: JSONType;
    rules: Rule[];
}
export interface Rule {
    keyword: string;
    definition: AddedKeywordDefinition;
}
export declare function getRules(): ValidationRules;
export {};
