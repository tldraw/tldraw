---
title: Custom validators for shape props
component: ./CustomValidatorsExample.tsx
category: shapes/tools
priority: 4
keywords: [validation, validators, check, refine, constraints, props, custom, shape]
---

Demonstrates using custom validators with `.check()` and `.refine()` methods to add validation constraints to shape props.

---

This example shows how to create custom validators for shape properties using `@tldraw/validate`. It demonstrates:

- Chaining `.check()` calls to add validation constraints without transforming values
- Using `.refine()` to validate and transform values

The example creates a custom shape with two validated properties:

1. **Percentage** - Chains multiple `.check()` calls to validate that the value is between 0 and 100
2. **Rating** - Uses `.refine()` to both validate and clamp the value between 1 and 5

When the example loads, it creates one valid shape and attempts to create another with an invalid percentage. Open your browser console to see the validation error.
