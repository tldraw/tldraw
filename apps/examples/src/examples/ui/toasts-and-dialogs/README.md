---
title: Toasts and dialogs
component: ./ToastsDialogsExample.tsx
priority: 1
keywords:
  [
    toasts,
    dialogs,
    useToasts,
    useDialogs,
    addToast,
    addDialog,
    notifications,
    modals,
    TldrawUiDialog,
  ]
---

Show toasts and dialogs from your own UI with the `useToasts` and `useDialogs` hooks.

---

`useToasts()` returns `addToast`, `removeToast`, and `clearToasts`; `useDialogs()` returns `addDialog`, `removeDialog`, and `clearDialogs`. Both hooks work in any component rendered inside `<Tldraw />`. This example puts a row of launcher buttons in the `SharePanel` slot.

`addDialog` takes a component that receives an `onClose` prop. Build the content from tldraw's dialog primitives (`TldrawUiDialogHeader`, `TldrawUiDialogBody`, `TldrawUiDialogFooter`) to match the default UI, or render anything you want. The example also shows a dialog containing a select menu, and a dialog that opens a second one on top of itself. Try opening the select and clicking outside it: the select closes but the dialog stays.
