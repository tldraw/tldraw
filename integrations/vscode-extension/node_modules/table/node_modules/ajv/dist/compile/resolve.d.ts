import type { AnySchema, AnySchemaObject } from "../types";
import type Ajv from "../ajv";
import * as URI from "uri-js";
export declare type LocalRefs = {
    [Ref in string]?: AnySchemaObject;
};
export declare function inlineRef(schema: AnySchema, limit?: boolean | number): boolean;
export declare function getFullPath(id?: string, normalize?: boolean): string;
export declare function _getFullPath(p: URI.URIComponents): string;
export declare function normalizeId(id: string | undefined): string;
export declare function resolveUrl(baseId: string, id: string): string;
export declare function getSchemaRefs(this: Ajv, schema: AnySchema): LocalRefs;
