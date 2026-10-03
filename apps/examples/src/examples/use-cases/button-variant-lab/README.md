---
title: Button variant lab
component: ./ButtonVariantLabExample.tsx
priority: 5
keywords:
  [
    iframe,
    srcdoc,
    createportal,
    design tokens,
    css variables,
    variants,
    atom,
    stylepanel,
    component preview,
  ]
---

Preview one React button in four variants, each in its own iframe, and edit its design tokens or source while every visible comparison updates live.

---

A component lab on the canvas: one React button rendered as four variants (primary, secondary, danger, and ghost), with every variant living in its own iframe, isolated from the page's styles.

Each frame is a custom shape. Its iframe loads a static `srcDoc` document, and because `srcDoc` iframes are same-origin, React portals the shared `LabButton` component and its stylesheet straight into the iframe's body. The stylesheet reads nothing but CSS custom properties, so a variant is just a set of token values and the iframe never reloads when they change.

The whole design lives in one reactive atom: each variant's token values plus the button's stylesheet. Every frame reads it with `useValue`, so an edit at any scope updates every visible comparison immediately. This state sits outside the store — it isn't undoable, persisted, or synced, and the example resets it on mount.

The token inspector builds on `DefaultStylePanel` in the top right. Its scope control decides what an edit targets: "Selected" writes per-shape overrides, "Variant" edits the base tokens of the selected variants, and "All" edits every variant. Overrides always shadow base values, a dot marks modified tokens, and each row can reset at the current scope. The "Component source" section edits the button's stylesheet itself and restyles every button as you type.

Use the toolbar to add frames; each variant stacks into its own column. Double-click a frame to interact with the button, which only receives pointer events while the shape is in the editing state.
