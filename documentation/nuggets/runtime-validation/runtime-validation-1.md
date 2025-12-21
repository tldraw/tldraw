---
title: Runtime validation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - validation
  - runtime
  - TypeScript
---

# Runtime validation

TypeScript types vanish when your code compiles to JavaScript. For most local code, this is fine—your type checker caught the bugs during development. But data from external sources doesn't come with TypeScript's guarantees. User input, network requests, browser storage, and multiplayer sessions can all violate the type assumptions your code depends on.

We learned this the hard way. A shape with `w: 0` passes TypeScript's type checker—zero is a valid number. But when you normalize a vector during rotation, that zero causes a division by zero. Your stack trace points at the math code, not the place where the invalid data entered the system. In a single-user app, you can usually track it down. In multiplayer, the bad data might have been created by another user's buggy client minutes ago, persisted to the server, and synced to your document. The stack trace is useless.

We need to validate at the boundary. When data enters from outside—whether it's loading from IndexedDB, arriving over a WebSocket, or coming from the clipboard—we validate it immediately. If it's invalid, we catch it there with a clear error message. If it passes, everything downstream can trust that the data is valid.

## The performance problem

Canvas editors validate hundreds of shapes on every user action. Reactive databases re-validate cached records as updates stream in. If you're validating the same large object repeatedly as it changes incrementally, full validation on every update is wasteful.

Moving a shape from `x: 100` to `x: 150` doesn't require re-validating the entire shape. The `x` property changed, but `width`, `height`, `rotation`, and everything else stayed the same. We only need to validate what changed.

## Incremental validation

The key optimization: use reference equality checks. When an object or array hasn't changed, its reference stays the same. We use `Object.is()` to compare references in O(1) time. If the reference is identical, we skip validation entirely. Only properties or array elements with different references need validation.

Here's how this works for objects:

```typescript
validateUsingKnownGoodVersion(knownGoodValue, newValue) {
  // Fast path: same reference means no changes
  if (Object.is(knownGoodValue, newValue)) {
    return knownGoodValue
  }

  let isDifferent = false

  for (const key in config) {
    const validator = config[key]
    const prev = knownGoodValue[key]
    const next = newValue[key]

    // Skip validation for unchanged properties
    if (Object.is(prev, next)) {
      continue
    }

    // Validate only what changed
    const checked = validator.validateUsingKnownGoodVersion
      ? validator.validateUsingKnownGoodVersion(prev, next)
      : validator.validate(next)

    if (!Object.is(checked, prev)) {
      isDifferent = true
    }
  }

  return isDifferent ? newValue : knownGoodValue
}
```

For a shape with ten properties, updating one property means nine `Object.is()` checks and one validation call. That's an order of magnitude faster than validating all ten properties.

This pattern recurses. When we update a shape's `props` object, we check each property. When we update an array of shapes, we check each element. Reference equality short-circuits at every level.

## Why reference equality works

We freeze validated objects in development mode. This prevents accidental mutations and ensures that changes always create new references. Production mode skips the freeze for performance, but we enforce immutability through code review and testing.

When validation passes without changes, we return the original reference. This preserves referential equality for React and reactive systems that depend on it. No unnecessary allocations, no extra garbage collection pressure.

## Validation interface

Every validator implements this interface:

```typescript
interface Validatable<T> {
  validate(value: unknown): T
  validateUsingKnownGoodVersion?(knownGoodValue: T, newValue: unknown): T
}
```

The `validate` method is standard one-shot validation. The optional `validateUsingKnownGoodVersion` method enables incremental validation. If it's not implemented, we fall back to full validation.

Validators compose. Optional wraps a validator to allow `undefined`. Nullable allows `null`. Array validators validate elements. Object validators validate properties. Each level can implement incremental validation independently.

## Security validation

External data can contain more than just invalid numbers. URLs in particular need careful validation. We use protocol whitelists to prevent XSS attacks:

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

This prevents `javascript:` URLs and other dangerous protocols from entering the system. We have different protocol sets for different use cases—links allow `mailto:`, image sources allow `data:` URLs, and so on.

## Error paths

When validation fails, we need clear error messages with paths through nested structures. A validation error at `shapes[3].props.width` should tell you exactly where the problem is, not just "expected positive number."

We track the path as we recurse through validators:

```typescript
try {
  validator.validate(value)
} catch (err) {
  if (err instanceof ValidationError) {
    throw new ValidationError(err.rawMessage, [path, ...err.path])
  }
  throw new ValidationError((err as Error).toString(), [path])
}
```

This pattern appears throughout the validation code. In development, we use a helper function to add path segments. In production, we inline the try-catch to avoid closure allocation overhead. Same behavior, lower cost in the hot path.

## Real-world numbers

A typical tldraw shape has around ten properties in its `props` object. When you drag a shape, only `x` and `y` change. Incremental validation checks ten references and validates two properties. Full validation would validate all ten properties plus any nested structures.

For an array of 100 shapes where five changed, incremental validation checks 100 references and validates five shapes. Full validation would validate all 100 shapes. The difference compounds with document size.

## Tradeoffs

Incremental validation adds complexity. You need to track previous values and handle reference comparisons correctly. You need to ensure immutability so reference checks are meaningful. Development mode helps catch bugs here—we freeze objects after validation and check that validators return the same reference when values are unchanged.

The performance win is worth it for our use case. Real-time collaborative editors with large documents and frequent updates hit the worst case for naive validation. Your mileage will vary. If you're validating API responses once per request, the simpler approach is fine.

We built this validation system because libraries like Zod are optimized for one-shot validation. The `validateUsingKnownGoodVersion` pattern is specific to our access pattern—validating the same large objects repeatedly as they change incrementally. It's not general-purpose validation. It's validation for reactive databases and real-time editors.

The code lives in `packages/validate/src/lib/validation.ts`. We use it throughout the tldraw stack—shape definitions, store records, and anything that crosses a trust boundary.
