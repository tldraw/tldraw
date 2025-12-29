---
title: Runtime validation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - validation
  - runtime
  - TypeScript
status: published
date: 12/21/2025
order: 2
---

# Runtime validation

When we built tldraw's validation system, we knew performance would matter. Canvas editors validate hundreds of shapes on every action. But we also knew that validation sits at a trust boundary—it's the last defense against malicious URLs, NaN coordinates, and data that could crash the editor.

The challenge: make validation both fast enough to be invisible and strict enough to catch attacks.

## Security through protocol whitelists

The obvious way to validate a URL is to check if it parses. The `URL` constructor throws for malformed strings, so wrapping it in a try-catch seems sufficient:

```typescript
try {
	new URL(value)
	return value
} catch {
	throw new ValidationError('Invalid URL')
}
```

This catches syntax errors but misses the actual threat. `javascript:alert('xss')` is a perfectly valid URL. So is `data:text/html,<script>alert('xss')</script>`. The URL constructor accepts them without complaint.

We use protocol whitelists instead. For clickable links, we allow three protocols:

```typescript
const validLinkProtocols = new Set(['http:', 'https:', 'mailto:'])

export const linkUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!validLinkProtocols.has(url.protocol.toLowerCase())) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})
```

For image and video sources, we need different rules. Data URLs are fine for embedded images. Our `asset:` protocol references IndexedDB-backed blobs. But `javascript:` is still forbidden:

```typescript
const validSrcProtocols = new Set(['http:', 'https:', 'data:', 'asset:'])

export const srcUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!validSrcProtocols.has(url.protocol.toLowerCase())) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})
```

The pattern is consistent: parse first, then check the protocol against a Set. Set lookup is O(1). Protocol comparison uses `.toLowerCase()` because the URL spec allows case variations.

We allow empty strings everywhere. This represents "no URL" without forcing every URL field to be nullable. It's a practical concession—empty string is technically invalid but commonly used as a default.

## Performance micro-optimizations

Validators run constantly. Small inefficiencies compound. We made several changes that look pedantic in isolation but matter when validation happens thousands of times per interaction.

### NaN checks without function calls

JavaScript has `Number.isNaN()` to test for NaN. It's explicit and readable. It's also a function call. We use arithmetic instead:

```typescript
if (value !== value) {
	throw new ValidationError('Expected a number, got NaN')
}
```

NaN is the only value in JavaScript that doesn't equal itself. `value !== value` is true only for NaN. It's faster than a function call and compiles to a direct comparison.

For checking both NaN and Infinity at once, we use another arithmetic trick:

```typescript
const numVariant = Number(variant)
if (numVariant - numVariant !== 0) {
	throw new ValidationError(`Expected a number for key "${this.key}", got "${variant}"`)
}
```

For any finite number, `x - x === 0`. For Infinity, `Infinity - Infinity` is NaN, which fails the equality check. For NaN, `NaN - NaN` is also NaN. One subtraction and one comparison replace two function calls.

### Avoiding array allocation in loops

Object validation iterates over properties. The obvious approach uses `Object.entries()`:

```typescript
for (const [key, value] of Object.entries(object)) {
	// validate value
}
```

This allocates an array of `[key, value]` tuples. For an object with ten properties, that's ten arrays created and immediately discarded. We use `for...in` instead:

```typescript
for (const key in object) {
	if (!hasOwnProperty(object, key)) continue
	const value = object[key]
	// validate value
}
```

No intermediate array. The `hasOwnProperty` check filters out inherited properties—same semantics as `Object.entries()`, but with one allocation instead of N.

### Inline error handling in production

In development, we wrap validation calls in a helper that prefixes error paths:

```typescript
function prefixError<T>(path: string | number, fn: () => T): T {
	try {
		return fn()
	} catch (err) {
		if (err instanceof ValidationError) {
			throw new ValidationError(err.rawMessage, [path, ...err.path])
		}
		throw new ValidationError((err as Error).toString(), [path])
	}
}

// Usage
prefixError('email', () => emailValidator.validate(value))
```

This keeps code clean and provides nice error messages. The problem: `prefixError` creates a closure. That closure captures variables from the caller's scope. In production builds, where validation might run thousands of times during a single interaction, closure allocation shows up in profiles.

We inline the try-catch in production:

```typescript
if (IS_DEV) {
	prefixError(i, () => itemValidator.validate(arr[i]))
} else {
	try {
		itemValidator.validate(arr[i])
	} catch (err) {
		if (err instanceof ValidationError) {
			throw new ValidationError(err.rawMessage, [i, ...err.path])
		}
		throw new ValidationError((err as Error).toString(), [i])
	}
}
```

It's verbose. It duplicates code. It's also measurably faster in hot paths. We check `IS_DEV` once at module load time, so bundlers can eliminate dead branches during minification.

### Early reference checks

Object validation uses reference equality to skip unchanged properties:

```typescript
for (const key in config) {
	const prev = knownGoodValue[key]
	const next = newValue[key]

	// sneaky quick check here to avoid the prefix + validator overhead
	if (Object.is(prev, next)) {
		continue
	}

	// Validate only what changed
	const checked = validator.validateUsingKnownGoodVersion(prev, next)
}
```

The comment "sneaky quick check" appears in the actual code. It's there because `Object.is()` is cheap—a pointer comparison—while building error paths and running validators is expensive. This single line eliminates 90% of validation work when updating a shape that changed only one property.

## Where the tradeoffs matter

These optimizations look obsessive. Replacing `Number.isNaN()` with `value !== value` saves microseconds. But validation sits in the critical path for every state change. Those microseconds add up.

When you drag a shape, the editor updates its position dozens of times per second. Each update validates the shape record. Each validation checks every property, even though only `x` and `y` changed. Early-exit reference checks mean validation cost is proportional to what changed, not what exists.

The security constraints aren't negotiable. Protocol whitelists stop XSS. The performance optimizations are about making security cheap enough to apply everywhere. You don't have to choose between safe and fast—you engineer both.

The code lives in `/packages/validate/src/lib/validation.ts`. URL validators are near the bottom. Micro-optimizations appear throughout—look for `Object.is()` checks, `for...in` loops, and the `IS_DEV` branches that conditionally inline error handling.
