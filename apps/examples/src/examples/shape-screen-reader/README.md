---
title: Accessible custom shape
component: ./ShapeScreenReaderExample.tsx
category: shapes/tools
priority: 1
keywords: [accessibility, a11y, screen reader, aria, custom shape, getAriaDescriptor, getText]
---

Demonstrate accessible custom shapes with screen reader descriptions.

---

This example demonstrates how to implement accessible custom shapes that provide meaningful descriptions for screen readers. When shapes are selected, the announcement system uses the `getAriaDescriptor()` and `getText()` methods from ShapeUtil to generate appropriate accessibility announcements.

The example creates a custom "card" shape with a title and description. The `getAriaDescriptor()` method returns a combined announcement that describes the card's content, while `getText()` returns the visible text content for text extraction and search.

Key accessibility methods:
- `getAriaDescriptor()` - Returns alt-text-style descriptions for accessibility announcements
- `getText()` - Returns visible text content from shapes (for text extraction and search)

When you select different cards in this example, screen readers will announce their content using the custom descriptions provided by `getAriaDescriptor()`.
