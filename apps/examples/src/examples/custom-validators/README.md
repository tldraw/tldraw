---
title: Custom validators for shape props
component: ./CustomValidatorsExample.tsx
category: shapes/tools
priority: 4
keywords:
  [
    validation,
    validators,
    check,
    refine,
    constraints,
    props,
    shapeutil,
    recordprops,
    error handling,
  ]
---

Demonstrates using custom validators with `.check()` and `.refine()` methods to add validation constraints to shape props.

---

This example shows how to create custom validators for shape properties using `@tldraw/validate`. It demonstrates:

- Chaining `.check()` calls to add validation constraints without transforming values
- Using `.refine()` to validate and transform values

The example creates a custom shape with two validated properties:

1. **Percentage** - Chains multiple `.check()` calls to validate that the value is between 0 and 100. Invalid values throw an error.
2. **Rating** - Uses `.refine()` to clamp values to the 1-5 range. Invalid values are transformed rather than rejected.

When the example loads, it demonstrates both behaviors: attempting to create a shape with percentage=150 throws an error, while creating a shape with rating=10 succeeds but the value is clamped to 5.
