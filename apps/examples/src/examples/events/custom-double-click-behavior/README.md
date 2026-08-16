---
title: Custom double-click behavior
component: ./CustomDoubleClickBehaviorExample.tsx
priority: 4
keywords:
  [
    double click,
    override,
    statenode,
    select tool,
    method replacement,
    handleDoubleClickOnCanvas,
    getStateDescendant,
    runtime,
    idle state,
    createTextOnCanvasDoubleClick,
  ]
---

Replace what happens when the user double-clicks on empty canvas by patching the select tool's `Idle` state at runtime.

---

By default, double-clicking on empty canvas creates a text shape and starts editing it. That
behavior lives in the `handleDoubleClickOnCanvas` method of the select tool's `Idle` state. This
example uses `editor.getStateDescendant('select.idle')` from `onMount` to grab that state and
replace the method with one that shows an alert.

Try double-clicking on the canvas. Double-clicking an editable shape still edits it as usual, but
double-clicking a shape that can't be edited falls through to the same method, so it shows the
alert too.

**This example is hacky.** Patching a built-in state's method is a lightweight way to tweak one
behavior without writing a whole custom tool, but `handleDoubleClickOnCanvas` is not public API and
can be renamed or removed in any release. If you only want to disable the default, pass
`options={{ createTextOnCanvasDoubleClick: false }}` to `<Tldraw>` instead. If you need different
behavior, write a custom select tool.
