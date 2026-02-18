---
title: Custom Style Resolver
component: ./CustomStyleResolverExample.tsx
category: shapes/tools
priority: 3
keywords: [style, props, resolver, custom, override, $]
---

Define custom style props that resolve to style overrides.

This example shows how to create custom `$`-prefixed style props that use resolvers
to compute style overrides. This is useful for:

- Creating high-level style abstractions (like a "warning" mode that sets multiple style properties)
- Building theme-aware custom styles
- Overriding built-in style behavior
