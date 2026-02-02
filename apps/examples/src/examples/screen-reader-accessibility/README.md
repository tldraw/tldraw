---
title: Screen reader accessibility
component: ./ScreenReaderAccessibilityExample.tsx
category: ui
priority: 1
keywords:
  [
    accessibility,
    a11y,
    screen reader,
    aria,
    getariadescriptor,
    gettext,
    usea11y,
    announcements,
    aria live region,
    polite,
    assertive,
    wcag,
  ]
---

Implement accessible custom shapes and custom screen reader announcements.

---

This example demonstrates two key aspects of screen reader accessibility in tldraw:

## Custom shapes with screen reader descriptions

When shapes are selected, the announcement system uses the `getAriaDescriptor()` and `getText()` methods from ShapeUtil to generate appropriate accessibility announcements.

- **`getAriaDescriptor()`** - Returns alt-text-style descriptions for accessibility announcements. When a shape is selected, this description is announced to screen reader users. It returns a combined announcement like "Meeting Notes - Discussed Q4 planning" that describes the card's purpose and content.

- **`getText()`** - Returns visible text content from shapes (for text extraction and search). This is used for text extraction, search functionality, and as a fallback for accessibility if `getAriaDescriptor()` is not provided.

## Custom screen reader announcements

The example also demonstrates how to use the `useA11y()` hook to create custom screen reader announcements for your UI components. Screen readers use ARIA live regions to announce dynamic content changes to users.

The example shows three common use cases:

- **Polite announcements**: Use `priority: 'polite'` for informational messages that don't require immediate attention (e.g., "Action completed for 2 shapes"). These announcements wait for the screen reader to finish its current announcement.

- **Assertive announcements**: Use `priority: 'assertive'` for important messages that need immediate attention (e.g., validation errors). These announcements interrupt the current screen reader output.

- **State change announcements**: Announce state changes to keep users informed of the current application state.

The announcements are rendered in an off-screen ARIA live region by the `DefaultA11yAnnouncer` component, making them accessible to screen readers without cluttering the visual interface.
