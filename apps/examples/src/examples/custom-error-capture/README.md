---
title: Custom error capture
component: ./CustomErrorCaptureExample.tsx
category: ui
priority: 3
keywords:
  [
    error,
    ErrorFallback,
    error boundary,
    crash handling,
    getErrorAnnotations,
    sentry,
    debugging,
    error tracking,
  ]
---

Customize the error screen that appears when the editor crashes.

---

This example shows how to capture errors in the editor and send them to your error tracking service (like Sentry).

When a critical error occurs in the editor, tldraw displays an error screen with options to refresh or reset. You can customize this screen by overriding the `ErrorFallback` component in the `components` prop.

The editor will annotate errors with additional information that you can use to troubleshoot issues. This is useful for capturing data about the user's application state at the time of the error, such as what tool was active or what the user's selected shapes were.

There is a separate component, `ShapeErrorFallback`, that handles errors in individual shapes. There is a separate example showing how to use that component. By contrast, the `ErrorFallback` component handles editor-level errors that affect the entire application.
