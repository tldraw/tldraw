declare type StrictNullChecksWrapper<Name extends string, Type> = undefined extends null ? `strictNullChecks must be true in tsconfig to use ${Name}` : Type;
export declare type SomeJSONSchema = UncheckedJSONSchemaType<Known, true>;
declare type UncheckedPartialSchema<T> = Partial<UncheckedJSONSchemaType<T, true>>;
export declare type PartialSchema<T> = StrictNullChecksWrapper<"PartialSchema", UncheckedPartialSchema<T>>;
declare type JSONType<T extends string, IsPartial extends boolean> = IsPartial extends true ? T | undefined : T;
interface NumberKeywords {
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    format?: string;
}
interface StringKeywords {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
}
declare type UncheckedJSONSchemaType<T, IsPartial extends boolean> = (// these two unions allow arbitrary unions of types
{
    anyOf: readonly UncheckedJSONSchemaType<T, IsPartial>[];
} | {
    oneOf: readonly UncheckedJSONSchemaType<T, IsPartial>[];
} | ({
    type: (T extends number ? JSONType<"number" | "integer", IsPartial> : T extends string ? JSONType<"string", IsPartial> : T extends boolean ? JSONType<"boolean", IsPartial> : never)[];
} & (T extends number ? NumberKeywords : T extends string ? StringKeywords : T extends boolean ? unknown : never)) | ((T extends number ? {
    type: JSONType<"number" | "integer", IsPartial>;
} & NumberKeywords : T extends string ? {
    type: JSONType<"string", IsPartial>;
} & StringKeywords : T extends boolean ? {
    type: "boolean";
} : T extends [any, ...any[]] ? {
    type: JSONType<"array", IsPartial>;
    items: {
        readonly [K in keyof T]-?: UncheckedJSONSchemaType<T[K], false> & Nullable<T[K]>;
    } & {
        length: T["length"];
    };
    minItems: T["length"];
} & ({
    maxItems: T["length"];
} | {
    additionalItems: false;
}) : T extends readonly any[] ? {
    type: JSONType<"array", IsPartial>;
    items: UncheckedJSONSchemaType<T[0], false>;
    contains?: UncheckedPartialSchema<T[0]>;
    minItems?: number;
    maxItems?: number;
    minContains?: number;
    maxContains?: number;
    uniqueItems?: true;
    additionalItems?: never;
} : T extends Record<string, any> ? {
    type: JSONType<"object", IsPartial>;
    additionalProperties?: boolean | UncheckedJSONSchemaType<T[string], false>;
    unevaluatedProperties?: boolean | UncheckedJSONSchemaType<T[string], false>;
    properties?: IsPartial extends true ? Partial<UncheckedPropertiesSchema<T>> : UncheckedPropertiesSchema<T>;
    patternProperties?: {
        [Pattern in string]?: UncheckedJSONSchemaType<T[string], false>;
    };
    propertyNames?: Omit<UncheckedJSONSchemaType<string, false>, "type"> & {
        type?: "string";
    };
    dependencies?: {
        [K in keyof T]?: Readonly<(keyof T)[]> | UncheckedPartialSchema<T>;
    };
    dependentRequired?: {
        [K in keyof T]?: Readonly<(keyof T)[]>;
    };
    dependentSchemas?: {
        [K in keyof T]?: UncheckedPartialSchema<T>;
    };
    minProperties?: number;
    maxProperties?: number;
} & (IsPartial extends true ? {
    required: Readonly<(keyof T)[]>;
} : [UncheckedRequiredMembers<T>] extends [never] ? {
    required?: Readonly<UncheckedRequiredMembers<T>[]>;
} : {
    required: Readonly<UncheckedRequiredMembers<T>[]>;
}) : T extends null ? {
    nullable: true;
} : never) & {
    allOf?: Readonly<UncheckedPartialSchema<T>[]>;
    anyOf?: Readonly<UncheckedPartialSchema<T>[]>;
    oneOf?: Readonly<UncheckedPartialSchema<T>[]>;
    if?: UncheckedPartialSchema<T>;
    then?: UncheckedPartialSchema<T>;
    else?: UncheckedPartialSchema<T>;
    not?: UncheckedPartialSchema<T>;
})) & {
    [keyword: string]: any;
    $id?: string;
    $ref?: string;
    $defs?: {
        [Key in string]?: UncheckedJSONSchemaType<Known, true>;
    };
    definitions?: {
        [Key in string]?: UncheckedJSONSchemaType<Known, true>;
    };
};
export declare type JSONSchemaType<T> = StrictNullChecksWrapper<"JSONSchemaType", UncheckedJSONSchemaType<T, false>>;
declare type Known = KnownRecord | [Known, ...Known[]] | Known[] | number | string | boolean | null;
interface KnownRecord extends Record<string, Known> {
}
declare type UncheckedPropertiesSchema<T> = {
    [K in keyof T]-?: (UncheckedJSONSchemaType<T[K], false> & Nullable<T[K]>) | {
        $ref: string;
    };
};
export declare type PropertiesSchema<T> = StrictNullChecksWrapper<"PropertiesSchema", UncheckedPropertiesSchema<T>>;
declare type UncheckedRequiredMembers<T> = {
    [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];
export declare type RequiredMembers<T> = StrictNullChecksWrapper<"RequiredMembers", UncheckedRequiredMembers<T>>;
declare type Nullable<T> = undefined extends T ? {
    nullable: true;
    const?: never;
    enum?: Readonly<(T | null)[]>;
    default?: T | null;
} : {
    const?: T;
    enum?: Readonly<T[]>;
    default?: T;
};
export {};
