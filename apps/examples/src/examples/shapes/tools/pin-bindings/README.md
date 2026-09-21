---
title: Pin (bindings)
component: ./PinExample.tsx
keywords:
  [
    bindings,
    bindingutil,
    custom binding,
    relationships,
    connections,
    network,
    custom tool,
    statenode,
    onafterchangetoshape,
    shape relationships,
    pin together,
  ]
priority: 10
---

Pin overlapping shapes together with a custom binding that keeps the whole network aligned.

---

The pin is a custom shape; the interesting part is `PinBindingUtil`. Dropping a pin over shapes creates a `pin` binding to each one, storing where on the shape the pin landed. When any pinned shape changes, `onAfterChangeToShape` records it and `onOperationComplete` solves the connected network once per operation, moving the other shapes so every pin stays put. Deleting a pinned shape deletes its pin, and reparenting one drags the pin along.

Try drawing two overlapping shapes, selecting the pin tool (or press P), and clicking where they overlap. Then drag one of the shapes: the other follows. Drag the pin itself to unpin.
