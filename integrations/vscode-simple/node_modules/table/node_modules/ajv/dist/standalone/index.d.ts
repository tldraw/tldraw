import type AjvCore from "../core";
import type { AnyValidateFunction } from "../types";
export default function standaloneCode(ajv: AjvCore, refsOrFunc?: {
    [K in string]?: string;
} | AnyValidateFunction): string;
