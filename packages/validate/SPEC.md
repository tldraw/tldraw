# @tldraw/validate behavior specification

This document states the rules that `@tldraw/validate` implements. It is written to drive testing: each rule has a stable ID (e.g. `V1`, `PE2`), each rule is independently observable through the public API, and the unit tests should be an expression of these rules. When a test and this document disagree, one of them is wrong — figure out which and fix it.

## 1. Model and vocabulary

- A **validator** is an object implementing the `Validatable<T>` interface: it has a `validate(value: unknown): T` method that throws `ValidationError` on failure, and optionally a `validateUsingKnownGoodVersion(knownGood: T, value: unknown): T` method for optimized re-validation.
- A **ValidatorFn** is a plain function `(value: unknown) => T` that throws on invalid input.
- A **validation error** occurs when a value does not meet the validator's requirements; it is represented by a `ValidationError` with a `rawMessage` and a `path` through the data structure.
- A **path** is an array of string and number keys indicating the location of an error in nested structures.
- **Referential equality** (`Object.is`) means two values are the same object or primitive value.
- A **known-good value** is a previously validated value of the correct type; `validateUsingKnownGoodVersion` uses this to optimize re-validation of nested structures.
- **Error path formatting** removes id references to aid grouping in error tracking services.

## 2. ValidationError behavior (E)

- **E1** `ValidationError` extends `Error` and has `name = 'ValidationError'`.
- **E2** `ValidationError(rawMessage, path)` formats the error message as `"At <path>: <rawMessage>"` when path is non-empty, or just `<rawMessage>` when path is empty.
- **E3** `ValidationError.rawMessage` is the undecorated message passed to the constructor.
- **E4** `ValidationError.path` is the array of keys describing the location of the error.
- **E5** Error paths are formatted by omitting id references: `id = <value>,` and `id = <value>)` are removed from the formatted path.
- **E6** Error path elements are formatted: array indices as `.0`, object keys as `.key`, and discriminator pairs as `(key = value)` or `(key = value1, key = value2)`.

## 3. Validator basics (V)

- **V1** `Validator<T>` implements `Validatable<T>` with a `validate(value: unknown): T` method.
- **V2** `validate(value)` calls the validation function and returns the result, throwing `ValidationError` if the function throws.
- **V3** In development mode, `validate` asserts that the returned value is referentially equal to the input (unless `skipSameValueCheck` is set). If not, it throws: `"Validator functions must return the same value they were passed"`.
- **V4** `validateUsingKnownGoodVersion(knownGood: T, newValue: unknown): T` first checks if `Object.is(knownGood, newValue)` is true; if so, it returns `knownGood` immediately without further validation.
- **V5** If a custom `validateUsingKnownGoodVersionFn` was provided to the constructor, `validateUsingKnownGoodVersion` calls it; otherwise, it calls `validate(newValue)`.
- **V6** `isValid(value: unknown): value is T` is a type guard that returns true if validation succeeds, false if it throws.
- **V7** `nullable()` returns a new `Validator<T | null>` accepting null; `optional()` returns `Validator<T | undefined>` accepting undefined.

## 4. Primitive validators (P)

- **P1** `T.unknown` accepts any value and returns it as-is.
- **P2** `T.any` accepts any value and types the result as `any`.
- **P3** `T.string` accepts only string values; rejects non-strings with `"Expected string, got <type>"`.
- **P4** `T.boolean` accepts only boolean values; rejects non-booleans with `"Expected boolean, got <type>"`.
- **P5** `T.bigint` accepts only bigint values; rejects non-bigints with `"Expected bigint, got <type>"`.
- **P6** `T.array` accepts only arrays (not array-like objects); rejects non-arrays with `"Expected an array, got <type>"`. Does not validate array contents.
- **P7** `T.unknownObject` accepts non-null objects (including arrays); rejects null, primitives, and non-objects with `"Expected object, got <type>"`.
- **P8** `typeToString(value)` returns descriptive type strings: `"a string"`, `"a number"`, `"an array"`, `"an object"`, `"null"`, `"undefined"`, etc.

## 5. Number validators (N)

- **N1** `T.number` accepts finite numbers; rejects Infinity, -Infinity, NaN, and non-numbers.
- **N2** `T.number` error messages: `"Expected number, got <type>"` for non-numbers; `"Expected a number, got NaN"` for NaN; `"Expected a finite number, got <value>"` for Infinity.
- **N3** `T.positiveNumber` accepts numbers >= 0 (zero is valid); rejects negative numbers, Infinity, NaN, and non-numbers.
- **N4** `T.nonZeroNumber` accepts numbers > 0; rejects zero, negative numbers, Infinity, NaN, and non-numbers with `"Expected a non-zero positive number, got <value>"`.
- **N5** `T.nonZeroFiniteNumber` accepts any finite non-zero number (including negative); rejects zero, Infinity, NaN, and non-numbers.
- **N6** `T.unitInterval` accepts numbers in [0, 1]; rejects numbers outside this range with `"Expected a number between 0 and 1, got <value>"`.
- **N7** `T.integer` accepts whole numbers; rejects decimals with `"Expected an integer, got <value>"`.
- **N8** `T.positiveInteger` accepts integers >= 0; rejects negative integers.
- **N9** `T.nonZeroInteger` accepts integers > 0; rejects zero and negative integers.

## 6. Literal and enum validators (L)

- **L1** `T.literal(value)` creates a validator accepting exactly that value; rejects other values with `"Expected <value>, got <actual>"`.
- **L2** `T.setEnum(set)` accepts values in the set; rejects others with `"Expected <option1> or <option2> or ..., got <value>"`.
- **L3** `T.literalEnum(...values)` creates a `setEnum` from the provided values.

## 7. Validation errors and error propagation (VP)

- **VP1** When a nested validator throws, the error is caught and re-thrown with the property/index key prepended to the path.
- **VP2** In development mode, `prefixError(key, fn)` calls `fn()` and catches `ValidationError`, prepending `key` to the path.
- **VP3** In production, errors are caught inline without the `prefixError` wrapper for reduced overhead.
- **VP4** Non-`ValidationError` throws are caught and converted to `ValidationError` with a string representation of the error.
- **VP5** Error messages may span multiple lines; indentation is added to continuation lines: `"At key: line1\n  line2"`.

## 8. Array validators (A)

- **A1** `T.arrayOf(itemValidator)` creates an `ArrayOfValidator<T>` that validates the array structure and each element.
- **A2** `arrayOf` validates that the value is an array, then validates each element with `itemValidator`.
- **A3** Element validation errors are prefixed with the array index: `"At 2: <error>"` for the element at index 2.
- **A4** `validateUsingKnownGoodVersion` on an array first checks reference equality. If different, it validates the array length and each element, using `itemValidator.validateUsingKnownGoodVersion` when available to optimize nested structures.
- **A5** Array length differences are detected; if the new array length differs from the known-good array length, the validation is marked as different.
- **A6** `nonEmpty()` returns a validator that rejects arrays with length 0; error: `"Expected a non-empty array"`.
- **A7** `lengthGreaterThan1()` returns a validator that rejects arrays with 1 or fewer elements; error: `"Expected an array with length greater than 1"`.

## 9. Object validators (O)

- **O1** `T.object(config)` creates an `ObjectValidator<Shape>` that validates object structure and each property.
- **O2** `object` validates that the value is a non-null object, then validates each property in the config using its validator.
- **O3** By default, `object` rejects unknown properties with `"Unexpected property"` at the unknown key path.
- **O4** `allowUnknownProperties()` returns a new `ObjectValidator` that permits extra properties.
- **O5** Property validation errors are prefixed with the property key: `"At name: <error>"` for property "name".
- **O6** `validateUsingKnownGoodVersion` checks reference equality first. If different, it validates known properties using `validateUsingKnownGoodVersion` on nested validators when available.
- **O7** Property changes are detected: if any known property differs (by reference equality) in the new value, the validation is marked as different.
- **O8** Key removal is detected: if the new object is missing a key that the known-good object had, it is marked as different.
- **O9** `extend(extension)` returns a new `ObjectValidator` with both original and new properties.

## 10. Dictionary validators (D)

- **D1** `T.dict(keyValidator, valueValidator)` creates a `DictValidator<Key, Value>` that validates both keys and values.
- **D2** `dict` iterates over object properties, validating each key and value with the provided validators.
- **D3** Key and value validation errors are prefixed with the property key: `"At key: <error>"`.
- **D4** `validateUsingKnownGoodVersion` detects new keys (not in known-good object), removed keys, and changed values.
- **D5** Values are validated with `valueValidator.validateUsingKnownGoodVersion` when available; otherwise with `validate`.
- **D6** Key count changes are detected: if the new object has more or fewer keys than the known-good object, it is marked as different.

## 11. Union/discriminated union validators (U)

- **U1** `T.union(discriminatorKey, config)` creates a `UnionValidator` that validates discriminated unions.
- **U2** `union` reads the discriminator property from the input object and selects the matching validator from config.
- **U3** If the discriminator is missing or the variant is unknown, `union` throws: `"Expected one of <variant1> or <variant2> or ..., got <actual>"` at the discriminator key.
- **U4** Once a variant is matched, the input is validated with that variant's validator, prefixed with `(key = variant)`.
- **U5** `validateUsingKnownGoodVersion` first checks if the discriminator value changed. If it did, a full validation is performed. If unchanged, the variant's `validateUsingKnownGoodVersion` is used.
- **U6** `T.numberUnion(discriminatorKey, config)` is like `union` but for numeric discriminators; it rejects Infinity, -Infinity, and NaN.
- **U7** `validateUnknownVariants(fn)` returns a new `UnionValidator` that calls `fn(object, variant)` for unknown variants instead of throwing.

## 12. Validation composition (C)

- **C1** `refine(transformFn)` returns a new validator that applies the transformation and returns the result. The returned value may have a different type than the input.
- **C2** `refine` has `skipSameValueCheck = true`, allowing it to return different value objects.
- **C3** `refine` composes with `validateUsingKnownGoodVersion`: if the base validator returns the known-good value, the refinement receives it as input and may further transform it.
- **C4** `check(checkFn)` returns a new validator that runs the check function (which should throw on failure) and returns the value unchanged.
- **C5** `check(name, checkFn)` prepends `(check <name>)` to error paths for better error messages.
- **C6** `or(v1, v2)` tries `v1.validate()` first; if it throws, tries `v2.validate()` and returns the result or rethrows.

## 13. Optional and nullable handling (ON)

- **ON1** `optional(validator)` accepts the validator's type or undefined; rejects null and other falsy non-undefined values.
- **ON2** `optional()` method is `validator.optional()`, returning `Validator<T | undefined>`.
- **ON3** `nullable(validator)` accepts the validator's type or null; rejects undefined and other falsy non-null values.
- **ON4** `nullable()` method is `validator.nullable()`, returning `Validator<T | null>`.
- **ON5** `validateUsingKnownGoodVersion` for optional/nullable: if the new value is undefined/null, return it immediately. Otherwise use the base validator's `validateUsingKnownGoodVersion` if available.
- **ON6** `skipSameValueCheck` is propagated from the inner validator to optional/nullable wrappers to allow nested refines.

## 14. Special validators (S)

- **S1** `T.model(name, validator)` returns a validator that prepends the model name to error paths for context: `"At Model.field: <error>"`.
- **S2** `T.jsonValue` accepts JSON-serializable values: strings, numbers, booleans, null, arrays of JSON values, and plain objects with JSON values.
- **S3** `T.jsonValue` rejects undefined, functions, symbols, and objects with non-JSON-serializable values.
- **S4** `T.jsonDict()` is `dict(string, jsonValue)`, validating string keys and JSON-serializable values.
- **S5** `T.linkUrl` accepts strings that are either empty or valid URLs with http://, https://, or mailto: protocols; rejects javascript: and other dangerous protocols with `"Expected a valid url, got <value> (invalid protocol)"`.
- **S6** `T.srcUrl` accepts strings that are either empty or valid URLs with http://, https://, data:, or asset: protocols; rejects other protocols with `"Expected a valid url, got <value> (invalid protocol)"`.
- **S7** `T.httpUrl` accepts strings that are either empty or valid http://, https: URLs; rejects other protocols with `"Expected a valid url, got <value> (invalid protocol)"`.
- **S8** `T.indexKey` validates that a string is a valid IndexKey format (delegates to `validateIndexKey` from utils).

## 15. Optimized validation (OP)

- **OP1** `validateUsingKnownGoodVersion` is optional but significantly improves performance when re-validating partially-changed data.
- **OP2** Primitive validators do not implement `validateUsingKnownGoodVersion`; they only use `validate`.
- **OP3** Container validators (ArrayOfValidator, ObjectValidator, DictValidator, UnionValidator, jsonValue) implement optimized re-validation that skips unchanged children.
- **OP4** The optimization checks reference equality first; if reference-equal, the value is returned immediately.
- **OP5** Only children that differ from the known-good value (by reference equality) are re-validated.
- **OP6** Nested validators' `validateUsingKnownGoodVersion` is called with `(knownGoodChild, newChild)` when available, recursively optimizing deeply-nested structures.

## 16. Type inference (T)

- **T1** `TypeOf<V extends Validatable<any>>` is a utility type that extracts `T` from `Validatable<T>`.
- **T2** `MakeUndefinedOptional` (from utils) transforms a shape where undefined properties become optional in the resulting type.
- **T3** `T.object(config)` returns an `ObjectValidator` whose type is `MakeUndefinedOptional<Shape>`, allowing undefined properties to be omitted.
