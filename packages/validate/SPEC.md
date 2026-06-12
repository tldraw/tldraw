# @tldraw/validate behavior specification

This document states the rules that `@tldraw/validate` implements. It is written to drive testing: each rule has a stable ID (e.g. `N3`, `U5`), each rule is independently observable through the public API, and the unit tests should be an expression of these rules. When a test and this document disagree, one of them is wrong — figure out which and fix it.

Rules marked **dev** describe assertions that run only in development builds (`NODE_ENV !== 'production'`). The test suite runs in development mode, so these rules are observable there; production builds skip them.

## 1. Model and vocabulary

- A **validator** is any object implementing `Validatable<T>`: `validate(value)` either returns the value typed as `T` or throws a `ValidationError`.
- A **known-good validation** is the optional fast path `validateUsingKnownGoodVersion(knownGoodValue, newValue)`: given a previously validated value, it validates only what changed and returns the known-good value itself when nothing did, so callers can use reference equality to detect "no change".
- A **plain validator** returns exactly the value it was given. A **transforming validator** (built with `refine`, or anything derived from it like `check` and `indexKey`) may return a different value.
- A validator's **path** locates a failure inside a nested structure: object keys, array indices, dict keys, union variants, check names, and model names each contribute a segment.

## 2. Validation errors and paths (E)

- **E1** `ValidationError` extends `Error`, has `name: 'ValidationError'`, and exposes the unprefixed `rawMessage` and the `path` array it was constructed with (default `[]`).
- **E2** The error `message` is `At <formattedPath>: <rawMessage>` when the path is non-empty, and just the raw message when the path is empty.
- **E3** Path formatting: string segments are joined with `.`, numeric segments appear as `.<index>`, and the leading dot is stripped (`users.0.email`).
- **E4** Parenthesized segments — union variants `(type = cat)` and named checks `(check foo)` — are appended without a dot, and consecutive parenthesized segments merge into one group: a named check on a union variant formats as `(type = cat, check foo)`.
- **E5** `id = …` content is stripped from formatted paths so errors group well in Sentry. A union discriminated on `id` therefore formats its variant segment as `()`.
- **E6** Multi-line raw messages are indented: every line after the first gets two leading spaces in `message`.
- **E7** Nested validators prefix their segment onto errors from inner validators, preserving `rawMessage` and accumulating `path` outside-in. A non-`ValidationError` exception thrown inside a validator is wrapped into a `ValidationError` whose raw message is the exception's `toString()`, with the path segment applied.

## 3. The validator core (V)

- **V1** A plain validator's `validate(value)` returns exactly the value it was passed — same reference, no clone, no mutation, no freezing.
- **V2** (dev) If a validator function returns a value that is not `Object.is`-equal to its input and was not created through a transforming API, `validate` throws `Validator functions must return the same value they were passed`.
- **V3** `isValid(value)` returns `true` when `validate` succeeds and `false` when it throws; it never throws.
- **V4** `validateUsingKnownGoodVersion(knownGoodValue, newValue)` returns `knownGoodValue` immediately — without running any validation — when `Object.is(knownGoodValue, newValue)`.
- **V5** When the references differ and the validator has no known-good implementation, `validateUsingKnownGoodVersion` falls back to a full `validate(newValue)`.

## 4. Refinement: refine and check (RC)

- **RC1** `refine(fn)` validates with the base validator, then passes the result through `fn`; the refined validator returns `fn`'s result, which may have a different type or value. A `ValidationError` thrown by `fn` propagates with path context from the surrounding structure.
- **RC2** A refined validator's known-good validation skips the refinement entirely when the base validator reports "no change" (returns the known-good value): the previous _output_ is returned. When the base reports a change, `fn` runs on the new validated value.
- **RC3** Because of V4, a refined validator's known-good validation accepts any `newValue` that is `Object.is`-equal to the previous _output_, even if that value would not pass `validate` from scratch (e.g. a number passed to a string-to-number refinement).
- **RC4** `check(fn)` adds an assertion without changing the value: `fn`'s return value is ignored, the input passes through. A failure carries no extra path segment.
- **RC5** `check(name, fn)` is the same but prefixes failures with a `(check <name>)` path segment.

## 5. optional and nullable (NO)

- **NO1** `nullable(v)` (and `v.nullable()`) accepts `null` and returns it without consulting the inner validator; all other values go to the inner validator, so `undefined` is rejected when the inner validator rejects it.
- **NO2** `optional(v)` (and `v.optional()`) accepts `undefined` the same way; `null` goes to the inner validator.
- **NO3** Known-good validation: a `null`/`undefined` new value short-circuits as in NO1/NO2; a `null`/`undefined` _known-good_ value forces a full inner `validate`; otherwise the inner validator's known-good path is used, preserving identity for unchanged values.
- **NO4** Wrapping a transforming validator in `optional`/`nullable` keeps it exempt from the dev same-value check (V2): `T.string.refine(...).optional()` may return transformed values.

## 6. Primitives (P)

- **P1** `string`, `boolean`, and `bigint` validate by `typeof` and reject everything else with `Expected <type>, got <description>`.
- **P2** The `<description>` in type-mismatch messages is: `null` for null, `an array` for arrays, `undefined` for undefined, `an object` for other objects, and `a <typeof>` for the remaining primitives (`a string`, `a number`, `a boolean`, `a bigint`, `a function`, `a symbol`).
- **P3** `unknown` and `any` accept every value — including `undefined` — and return it as-is.
- **P4** `literal(expected)` accepts exactly `expected` (strict equality) and rejects everything else with `Expected <expected>, got <JSON.stringify(actual)>`.
- **P5** `array` accepts any array without validating its items, and rejects non-arrays with `Expected an array, got <description>`.
- **P6** `unknownObject` accepts any non-null value with `typeof 'object'` and rejects `null` and primitives with `Expected object, got <description>`. Arrays pass this check (despite the description machinery knowing them as `an array`) — `T.unknownObject.validate([1, 2, 3])` returns the array.

## 7. Numbers (N)

- **N1** `number` accepts finite numbers, rejecting non-numbers (`Expected number, got <description>`), `NaN` (`Expected a number, got NaN`), and `Infinity`/`-Infinity` (`Expected a finite number, got <value>`).
- **N2** `positiveNumber` accepts finite numbers `>= 0` — zero included, despite the name. Negative values, including `-Infinity`, report `Expected a positive number, got <value>`; the NaN and non-number messages match N1.
- **N3** `nonZeroNumber` accepts finite numbers `> 0`. Zero and negative values, including `-Infinity`, report `Expected a non-zero positive number, got <value>`.
- **N4** `nonZeroFiniteNumber` accepts finite numbers that are not zero — negatives allowed. Zero reports `Expected a non-zero number, got 0`.
- **N5** `unitInterval` accepts finite numbers in `[0, 1]`. All other numbers — out-of-range values and the infinities alike — report `Expected a number between 0 and 1, got <value>`.
- **N6** `integer` accepts whole finite numbers (negatives included) and rejects fractional numbers with `Expected an integer, got <value>`; NaN and the infinities report as in N1.
- **N7** `positiveInteger` accepts integers `>= 0` (zero included). Any negative number — integer or fractional, `-1.5` included — reports `Expected a positive integer, got <value>`; non-negative fractional numbers report `Expected an integer, got <value>`.
- **N8** `nonZeroInteger` accepts integers `> 0`. Zero and negative numbers report `Expected a non-zero positive integer, got <value>`; positive fractional numbers report `Expected an integer, got <value>`.
- **N9** Negative zero is `>= 0` and an integer: `number`, `integer`, `positiveNumber`, and `positiveInteger` accept `-0`; `nonZeroNumber` and `nonZeroFiniteNumber` reject it as zero (`got 0` in the message).

## 8. Enums (EN)

- **EN1** `setEnum(set)` accepts exactly the set's members. The failure message lists the allowed values JSON-stringified and the actual value string-interpolated: `Expected "a" or "b", got c`.
- **EN2** `literalEnum(...values)` is `setEnum(new Set(values))`.

## 9. Arrays of validated items (A)

- **A1** `arrayOf(item)` requires an array and validates every element with `item`, prefixing the failing element's index onto the path.
- **A2** `.nonEmpty()` additionally rejects `[]` (`Expected a non-empty array`); `.lengthGreaterThan1()` rejects arrays of length `<= 1` (`Expected an array with length greater than 1`).
- **A3** Known-good validation returns the known-good array exactly when the lengths match and every element is unchanged: elements that are `Object.is`-equal to their counterparts are skipped outright, and the rest are revalidated with the item validator's known-good path, counting as unchanged when it returns the known-good element.
- **A4** When the length differs or any element changed, known-good validation returns the _new_ array; appended elements are fully validated, and elements past the new length are simply dropped with no validation.
- **A5** If the item validator has no known-good implementation, the array's known-good validation falls back to a full `validate` of the new array — which then returns the new array even when it is structurally equal to the known-good one.

## 10. Objects (O)

- **O1** `object(config)` requires a non-null object and validates each configured property with its validator, prefixing the property name on failure. A missing property is validated as `undefined` (so required properties fail with `Expected <type>, got undefined`).
- **O2** Properties not present in the config are rejected: `At <key>: Unexpected property`.
- **O3** `.allowUnknownProperties()` returns a _new_ validator that accepts extra properties without validating them; the original validator is unchanged.
- **O4** The object check is `typeof value === 'object' && value !== null`: arrays pass it. An empty array satisfies `T.object({})`; an array with elements then fails O2 on its indices (`At 0: Unexpected property`).
- **O5** `.extend(extension)` returns a new object validator over the merged config; extension keys override same-named config keys. The result rejects unknown properties regardless of the receiver's setting.
- **O6** Known-good validation returns the known-good object exactly when every configured property is unchanged (`Object.is`-equal or known-good-equal per the property's validator) and no keys were added or removed; otherwise it returns the new object. Only changed properties are revalidated.
- **O7** Known-good validation detects removed keys: a key present on the known-good object but absent from the new one makes the new object the result, even if all configured properties are unchanged.
- **O8** With `allowUnknownProperties`, known-good validation also compares unknown properties by `Object.is`: adding, removing, or changing an unknown property makes the new object the result.

## 11. Dictionaries (DI)

- **DI1** `dict(keyValidator, valueValidator)` requires a non-null object (arrays pass, as in O4) and validates every own enumerable key with `keyValidator` and every value with `valueValidator`, prefixing the key on failure.
- **DI2** `jsonDict()` is `dict(string, jsonValue)`.
- **DI3** Known-good validation returns the known-good object exactly when the same keys are present and every value is unchanged (`Object.is`-equal or known-good-equal). Added keys are fully validated and make the new object the result; removed keys are detected by comparing key counts; changed values are revalidated incrementally.

## 12. Discriminated unions (U)

- **U1** `union(key, config)` reads the discriminator property `key`, selects the matching variant validator, and validates the whole object with it, returning the input on success.
- **U2** Non-object inputs are rejected with `Expected an object, got <description>`.
- **U3** For string-keyed unions, a missing or non-string discriminator is rejected with `Expected a string for key "<key>", got <description>`.
- **U4** A discriminator that matches no variant is rejected with `Expected one of <variants> or …, got <JSON.stringify(variant)>` at path `[key]`.
- **U5** Variant validation failures are prefixed with the `(key = variant)` path segment.
- **U6** `validateUnknownVariants(handler)` returns a new union that calls `handler(value, variant)` for unmatched variants and uses its return value as the result. (dev) On the `validate` path the same-value check (V2) applies: a handler that returns a new object throws `Validator functions must return the same value they were passed`, so handlers must return the input itself. The known-good path does not run that check.
- **U7** Known-good validation with an unchanged discriminator uses the variant's known-good path (preserving identity for unchanged values); a changed discriminator falls back to a full validation against the new variant; unmatched variants go to the unknown-variant handler; a non-object on _either_ side throws per U2.
- **U8** `numberUnion(key, config)` requires the discriminator to coerce to a finite number: `Infinity`, `-Infinity`, `NaN`, and non-numeric strings are rejected with `Expected a number for key "<key>", got "<value>"`.
- **U9** `numberUnion` looks the variant up by the discriminator's own string coercion, so a string-numeric discriminator like `'1'` selects variant `1` (and then typically fails that variant's `literal`), while an unmatched finite number like `1.5` is rejected per U4.

## 13. JSON values (J)

- **J1** `jsonValue` accepts `null`, booleans, finite and non-finite numbers, strings, and arrays and plain objects of accepted values, recursively.
- **J2** It rejects `undefined`, functions, bigints, symbols, and class instances — anywhere in the structure, including inside arrays and object values. Sparse array holes read as `undefined`, so sparse arrays are rejected.
- **J3** "Plain object" means the prototype is `Object.prototype`, `null`, or the structured-clone prototype: `Object.create(null)` and `structuredClone` results validate.
- **J4** The full-validation failure message reports the `typeof` of the _root_ value (`Expected json serializable value, got object`), even when the offending value is nested.
- **J5** Known-good validation is incremental when both values are arrays or both are plain objects: unchanged (`Object.is`-equal) entries are skipped, added/changed entries are validated recursively, and the known-good value is returned exactly when nothing changed — length changes and removed keys make the new value the result.
- **J6** When the two values' shapes differ (array vs object vs scalar), known-good validation falls back to a full validation of the new value.

## 14. Models (M)

- **M1** `model(name, validator)` validates with the inner validator and prefixes `name` as the leading path segment on failure (`At user.email: …`).
- **M2** Its known-good validation delegates to the inner validator's (with the same prefixing), preserving identity for unchanged values.

## 15. URL validators (UR)

- **UR1** `linkUrl` accepts the empty string and absolute URLs with `http:`, `https:`, or `mailto:` protocols; other protocols are rejected with `(invalid protocol)` and unparseable strings with `Expected a valid url, got <string>`.
- **UR2** `srcUrl` is the same with the allowed protocols `http:`, `https:`, `data:`, and `asset:`.
- **UR3** `httpUrl` is the same with only `http:` and `https:` allowed.
- **UR4** Strings starting with `/` or `./` are parsed against a dummy `http:` origin and therefore validate against all three; other relative forms (`../x`, `foo`) are rejected.
- **UR5** Protocol matching is case-insensitive: `HTTP://example.com` validates, `JAVASCRIPT:alert(1)` does not.
- **UR6** All three are string validators first: non-strings fail with the P1 message.

## 16. Index keys (IK)

- **IK1** `indexKey` accepts strings that are valid fractional index keys (`'a0'`, `'a1J'`) and rejects invalid ones (`'a'`, `'a00'`, `''`) with `Expected an index key, got <JSON.stringify(key)>`.

## 17. Either-of (OR)

- **OR1** `or(v1, v2)` returns `v1.validate(value)` when it succeeds; when `v1` throws — for any reason — the value goes to `v2` and `v2`'s result is returned.
- **OR2** When both fail, `v2`'s error propagates; `v1`'s error is swallowed.
