---
title: Runtime validation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - runtime
  - validation
status: published
date: 12/21/2025
order: 4
---

# Runtime validation

Your TypeScript types say width is a number. But runtime gives you `w: 0`, and three operations later your vector normalization divides by zero. The stack trace points at perfectly correct math code. The real bug? It was created five minutes ago, possibly by another user in a multiplayer session.

This is the fundamental problem of runtime validation: catching bad data at the boundary before it propagates into your system and causes mysterious failures far from the source. But when you're validating thousands of objects on every update, naive validation becomes a performance bottleneck.

## Why validation matters (and why it's expensive)

TypeScript's type system disappears at runtime. When data enters your application—from user input, network requests, browser storage, or multiplayer sync—you have no guarantee it matches your types. A missing field, a NaN where you expected a number, or a malicious `javascript:` URL can all slip through.

Libraries like Zod solve this by validating data structures:

```typescript
import { z } from 'zod'

const shapeSchema = z.object({
	x: z.number(),
	y: z.number(),
	w: z.number().positive(),
	h: z.number().positive(),
})

const shape = shapeSchema.parse(untrustedData)
```

This works great for one-shot validation—API responses, form submissions, configuration files. But some applications have a different access pattern: validating the same large objects repeatedly as they change incrementally. A canvas editor might validate hundreds of shapes on every user action. A database client might re-validate cached records as updates stream in.

In these scenarios, full validation on every update is wasteful. When a shape moves from `x: 100` to `x: 150`, why re-validate the entire object? Only the `x` field changed.

## Incremental validation

Most updates only change a small part of a data structure. If you have a previously validated version, you can skip re-validating unchanged parts by comparing references.

```typescript
interface Validator<T> {
	validate(value: unknown): T
	validateUsingKnownGoodVersion?(knownGood: T, newValue: unknown): T
}
```

The `validateUsingKnownGoodVersion` method takes a known-good value and the new value to validate. For objects, it only validates properties that changed:

```typescript
validateUsingKnownGoodVersion(knownGood, newValue) {
  // Fast path: same reference means no changes
  if (Object.is(knownGood, newValue)) {
    return knownGood
  }

  let isDifferent = false
  for (const key in config) {
    const prev = knownGood[key]
    const next = newValue[key]

    // Skip validation for unchanged properties
    if (Object.is(prev, next)) continue

    // Only validate what changed
    const validated = validator[key].validateUsingKnownGoodVersion(prev, next)
    if (!Object.is(validated, prev)) {
      isDifferent = true
    }
  }

  return isDifferent ? newValue : knownGood
}
```

This works recursively. An array validator only validates changed elements. A nested object validator only validates changed properties. Unchanged parts are reused without re-validation.

The pattern applies to any tree-structured data. If you have:

```typescript
{
  user: { name: "Alice", settings: { theme: "dark" } },
  shapes: [shape1, shape2, shape3]
}
```

And only `settings.theme` changes, incremental validation:

1. Detects `user` changed (different reference)
2. Detects `user.name` unchanged (same reference) → skip
3. Detects `user.settings` changed (different reference)
4. Validates `settings.theme` (it changed)
5. Detects `shapes` unchanged (same reference) → skip entire array

This is fast because reference equality checks (`Object.is`) are O(1), while deep validation is O(n) in the size of the structure.

## Performance optimizations

Beyond the core algorithm, several micro-optimizations add up:

**Avoid closures in production**: Development uses a `prefixError` helper function that captures context for better error messages. Production inlines this code to avoid closure allocation overhead:

```typescript
if (IS_DEV) {
	prefixError(key, () => validator.validate(value))
} else {
	try {
		validator.validate(value)
	} catch (err) {
		if (err instanceof ValidationError) {
			throw new ValidationError(err.rawMessage, [key, ...err.path])
		}
		throw err
	}
}
```

**Efficient iteration**: Use `for...in` instead of `Object.entries()` to avoid allocating an array:

```typescript
// Slower: allocates array of [key, value] tuples
for (const [key, value] of Object.entries(obj)) { ... }

// Faster: no allocation
for (const key in obj) {
  if (!hasOwnProperty(obj, key)) continue
  const value = obj[key]
  ...
}
```

**Cached environment checks**: Read `process.env.NODE_ENV` once at module load, not on every validation call.

## Why not just use Zod?

Zod is excellent for most use cases. But it's designed for one-shot validation, not incremental validation of large, frequently-changing data structures. The `validateUsingKnownGoodVersion` pattern is specific to this access pattern and isn't something you'd want to add to a general-purpose validation library.

There are other considerations too:

- **Bundle size**: A specialized validator with zero dependencies is smaller than a general-purpose library
- **Performance characteristics**: Optimizations for the incremental case don't help the one-shot case
- **Type inference**: Complex generic types for incremental validation would complicate the API

For applications that need incremental validation—real-time editors, databases with reactivity, state management with large objects—the pattern is worth implementing. For everything else, Zod is probably the better choice.

## Validation as security

Validation isn't just about preventing crashes—it's also a security boundary. Consider URL validators:

```typescript
const linkUrl = string.check((value) => {
	if (value === '') return
	const url = new URL(value)

	if (!validLinkProtocols.has(url.protocol)) {
		throw new ValidationError('Invalid protocol')
	}
})

const validLinkProtocols = new Set(['http:', 'https:', 'mailto:'])
```

This prevents XSS attacks via `javascript:` URLs. When user input flows into `href` attributes, validation ensures only safe protocols are allowed. Similar patterns protect against prototype pollution, SQL injection in query parameters, and other injection attacks.

By validating at boundaries—when data enters from storage, network, or user input—you create a trust boundary where everything inside your application has known-good properties. This is more robust than trying to sanitize data at every use site.

## Key files

- `packages/validate/src/lib/validation.ts` — Core validation implementation with incremental validation
- `packages/tlschema/src/shapes/` — Shape validators showing real-world usage
- `packages/store/src/lib/Store.ts` — Store integration that validates on every update
- `packages/store/src/lib/RecordType.ts` — Record type wrapper that uses `validateUsingKnownGoodVersion`
