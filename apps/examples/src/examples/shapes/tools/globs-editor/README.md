---
title: Globs
component: ./GlobsExample.tsx
keywords:
  [
    custom shape,
    custom tool,
    bindings,
    bindingutil,
    handles,
    custom handles,
    statenode,
    vector editor,
    bezier,
    tension handles,
  ]
priority: 30
---

A vector editor built from globs: skins stretched between circular nodes and edited with handles.

---

Globs are the shape primitive from [this paper](https://jcgt.org/published/0004/03/01/paper-lowres.pdf). This example builds them from three SDK pieces: a `node` shape (a circle with a radius handle), a `glob` shape whose geometry is derived from the two nodes it spans plus its own `d` and tension handles, and a `glob` binding that keeps the glob attached as its nodes move. A custom `glob` tool with `node` and `connect` states places nodes and stretches globs between them.

**Parts of this example are hacky.** `GlobsExample.tsx` patches the select tool's `pointing_handle` state at runtime and overrides `editor.getContentFromCurrentPage` so copies include the nodes a glob depends on. Neither is public API and both can break between releases. The shape utils, binding util, and tool are all built on supported APIs.

Shortcuts:

- Press N to place a node.
- Select a node and press C, then click to place a new node or click an existing one to connect them with a glob.
- Hold cmd while dragging a `d` handle to move its opposite handle too.
- Hold cmd while dragging a tension handle to move its opposite handle too.
- Hold cmd and shift to drag all four tension handles on a glob together.
- Hold space to preview the glob filled.
