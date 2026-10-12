---
title: External UI (using context)
component: ./ExternalUiContextExample.tsx
priority: 20
keywords:
  [
    custom ui,
    toolbar,
    buttons,
    context,
    createcontext,
    usecontext,
    onmount,
    getcurrenttoolid,
    setcurrenttool,
    getstylefornextshape,
    setstylefornextshapes,
  ]
---

Control the editor from a toolbar rendered outside the `Tldraw` component, sharing the editor through React context.

---

UI that lives outside the `Tldraw` component can't use `useEditor()`. This example captures the editor in `onMount`, stores it in state, and then provides it through a React context so any descendant component (here, an `ExternalToolbar` rendered below the canvas) can read it with `useContext`.

The provider only renders once the editor exists, so consumers never have to handle a `null` editor. Compare with the [External UI (using state)](https://tldraw.dev/examples/external-ui) example, which keeps the editor in local state and uses it in the same component.
