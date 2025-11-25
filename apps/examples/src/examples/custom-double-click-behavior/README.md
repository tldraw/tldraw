---
title: Custom double-click behavior
component: ./CustomDoubleClickBehaviorExample.tsx
category: events
priority: 4
keywords: [double click, runtime override, state node, select tool, custom behavior]
---

Override the default double-click behavior by replacing the SelectTool's Idle state method at runtime.

---

This example shows how to customize the double-click behavior on canvas by overriding the SelectTool's Idle state's `handleDoubleClickOnCanvas` method from the `onMount` callback.

The example demonstrates runtime method replacement, which is a powerful technique for customizing built-in tool behavior without creating entirely new tools. In this simplified version, double-clicking on the canvas shows an alert instead of creating a text shape, demonstrating the basic pattern for method override.

This pattern is useful when you want to extend existing tool behavior, add conditional logic, or customize built-in interactions without forking the entire tool.
