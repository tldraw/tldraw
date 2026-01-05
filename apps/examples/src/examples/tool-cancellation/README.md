---
title: Tool cancellation and interruption
component: ./ToolCancellationExample.tsx
category: shapes/tools
priority: 1
keywords: [tool, cancel, interrupt, complete, state, cleanup, preview, bailToMark]
---

Handling tool interruption and cancellation with proper cleanup.

---

This example demonstrates how to properly handle tool lifecycle events when creating multi-step tools:

- **onInterrupt()** - Called when the tool is interrupted by another action (like switching tools)
- **onCancel()** - Called when the user presses Escape to cancel the operation
- **onComplete()** - Called when the operation finishes successfully
- **editor.bailToMark(markId)** - Undoes changes back to a specific history point
- **Preview shapes** - Temporary shapes shown during interaction

The example creates a simple drawing tool that lets you create a rectangle by clicking and dragging. If you cancel or the tool is interrupted, the preview rectangle is removed. If you complete the operation, the rectangle is committed to the canvas.

Key patterns demonstrated:

1. Creating a history mark at the start of an operation
2. Creating preview shapes during interaction
3. Using bailToMark to clean up on cancel/interrupt
4. Understanding the difference between cancel (user action via Escape) and interrupt (external, like tool switching)
5. Properly cleaning up temporary state in onExit
