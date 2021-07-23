import type { SchemaObject } from "../../types";
export declare type SchemaObjectMap = {
    [Ref in string]?: SchemaObject;
};
export declare const jtdForms: readonly ["elements", "values", "discriminator", "properties", "optionalProperties", "enum", "type", "ref"];
export declare type JTDForm = typeof jtdForms[number];
