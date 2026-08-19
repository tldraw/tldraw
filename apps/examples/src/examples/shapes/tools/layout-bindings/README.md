---
title: Layout constraints (bindings)
component: ./LayoutExample.tsx
keywords:
  [
    bindings,
    constraints,
    layout,
    position,
    container,
    drag,
    drop,
    bindingutil,
    ontranslate,
    ontranslatestart,
    ontranslateend,
    relationships,
    custom binding,
  ]
priority: 10
---

Lay out shapes in a row using bindings that hold each shape's position in a container.

---

Bindings let one shape respond to changes in another. Here a container shape and its element shapes are related by `layout` bindings, each carrying a fractional `index`. `LayoutBindingUtil` re-runs the layout whenever a binding is created, changed, or deleted, or the container moves: elements snap into their slots and the container resizes to fit. The element shape util's `onTranslateStart`, `onTranslate`, and `onTranslateEnd` create and move a placeholder binding while dragging so the row makes room before the drop.

Try dragging an element to a different slot in the container, or out onto the page and back in.
