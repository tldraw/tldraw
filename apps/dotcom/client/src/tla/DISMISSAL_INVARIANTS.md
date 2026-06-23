# Dismissal & click-through invariants (tldraw.com)

Source-of-truth for how open "dismissables" (menus, popovers, selects, dialogs) behave on
tldraw.com — what dismisses them, and crucially what a dismissing press does (or doesn't do) to
whatever sits underneath it.

It is written so the desired _behavior_ can be preserved across an implementation change. Today the
primitives are Radix; a future PR replaces Radix with **Base UI**. Base UI's modal/non-modal/focus
knobs differ, so treat the **Behavior matrix** below as the contract and re-derive the mechanism.

---

## The core invariant

> **A press outside an open dismissable only dismisses it. It must not also interact with whatever
> is underneath the press** (navigate to a file, open a second menu, create a shape, hit a button).
> To then interact, you press again.

Dismissal is judged at pointer-**down**, not on a full click: it fires on an outside pointer-down. A
gesture that _begins inside_ a dismissable and releases outside (e.g. selecting text in a dialog and
dragging onto the backdrop) does **not** dismiss. (Enforced by `Dialogs.test.tsx` /
`test-dialogs.spec.ts`.)

The one deliberate exception is **dragging on the canvas** — see the matrix.

---

## The dismissables and their modality

| Dismissable       | Examples                                           | Today (Radix)                                            | Why                                                                        |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Dropdown menu** | workspace switcher, file `…` menus, user-settings  | **non-modal** (we override Radix's `modal=true` default) | keep the canvas live while open; modal is defeated here anyway (see below) |
| **Popover**       | file share menu                                    | **non-modal** (Radix default)                            | popover is a non-blocking auxiliary panel                                  |
| **Select**        | export theme/format, member role                   | **modal** (Radix `Select` is always modal)               | mirrors native `<select>`; already blocks click-through                    |
| **Dialog**        | workspace settings, create/delete workspace, legal | **modal**, with its own overlay/positioner               | true modal; blocks everything; layer-aware dismissal                       |

**Why dropdowns/popovers are non-modal** (and modal is _not_ an option for them here):

1. Modal sets `pointer-events: none` on `document.body`. That would freeze the **canvas**, killing
   click-to-draw-while-dismissing (the drag case below). Non-modal keeps the surface live.
2. The app sets explicit `pointer-events: all` on ~31 elements (canvas overlays, sidebar bits). An
   explicit `pointer-events: all` on a descendant **overrides** the body-level `none`, so modal's
   click-capture leaks through anyway. (This is why #9330 reverted modal for an overlay.)
3. With **controlled** menus (open state in the `tlmenus` registry), the dismissing press triggers a
   synchronous unmount that lifts `pointer-events: none` before the click resolves → click-through.
4. Two modal controlled dropdowns don't cross-dismiss (both stay open).

Because non-modal Radix dismiss is **passive** (a document `pointerdown` listener closes the menu but
neither `preventDefault`s the press nor disables outside pointer events), we re-add "press only
dismisses" with **overlays**, scoped per region.

---

## z-index layers (stacking model)

```
--tl-layer-menu-click-capture: 250   # MenuClickCapture (canvas), inside the editor's stacking
--tl-layer-panels:             300   # editor UI panels / header
--tl-layer-menus:              400   # menu/popover content (Radix popper wrapper inherits this)
```

- **Portal target = the app container** (`.tl-container` from `TlaRootProviders`, exposed via
  `useContainer()`). It wraps **both** the sidebar and the editor, so menus portal _above_ the
  sidebar and editor, and an overlay portaled/placed there can sit just under them.
- `MenuClickCapture` is `position: fixed; inset: 0` but its z-index (`250`) lives **inside the
  editor's** stacking context, so it covers the canvas but **not** the sidebar (which is a sibling
  above the editor) — that's the gap the sidebar overlay fills.
- `TlaMenuClickCapture` is the shared dotcom overlay. It mounts `position: absolute; inset: 0` at
  `calc(var(--tl-layer-menus) + 1)` inside whichever chrome region renders it: the sidebar (`.sidebar`,
  a `z-index: 100` stacking context) and the editor's top panels (`.topLeftPanel` / `.topRightPanel` —
  the SDK `MenuPanel` / `SharePanel` slots). That value is measured against the region's own children
  (covering its buttons), **not** the global layer — the portaled menus sit in the higher app-container
  context and stay above it. It deliberately never covers the **canvas**: the SDK's `MenuClickCapture`
  keeps that (with its drag-forward), so click-to-draw is untouched.

---

## The overlays (how "press only dismisses" is achieved on non-modal menus)

Both mount when **`tlmenus.hasAnyOpenMenus()`** is true and dismiss via **`tlmenus.clearOpenMenus()`**.
They are **independent of Radix** — they only need "is any menu open?" — so they survive the Base UI
refactor unchanged.

| Overlay                        | Region                      | On a click                                                       | On a click-drag                                                                                                                                      |
| ------------------------------ | --------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MenuClickCapture` (SDK)       | canvas                      | `clearOpenMenus()`, swallow                                      | `clearOpenMenus()` **and forwards** a `pointer_down` to the canvas at the original press point, then forwards moves — so the drag draws/selects/pans |
| `TlaMenuClickCapture` (dotcom) | sidebar + editor top panels | `clearOpenMenus()`, swallow (`preventDefault`+`stopPropagation`) | same — swallow, **no forward** (a chrome drag has nothing to forward to)                                                                             |

The press lands on the overlay (it's the top-of-stack target via z-index, robust regardless of the
underlying elements' `pointer-events`), so the element beneath never receives a `pointerdown`; a
`click` can't even form on it. The dismiss is explicit because `stopPropagation` would otherwise stop
Radix's own bubble-phase outside-detection.

---

## Behavior matrix (the contract)

Given **an open menu/popover** (dropdown, file menu, switcher, share popover), a press on:

| Press target                                                                                            | Click (press+release, no move)                                                           | Click-drag                                                                     |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **the menu content itself**                                                                             | normal — selects the item                                                                | normal                                                                         |
| **the canvas**                                                                                          | dismiss only — **no shape/dot created**                                                  | **dismiss AND start the drag from the press point** (draw/select/pan per tool) |
| **the sidebar** (file link, another menu's trigger, empty area)                                         | dismiss only — **no navigation, no second menu opens** (strict; press again to act)      | dismiss only — no forward                                                      |
| **the editor top panels** (top-left menu / file name, top-right share / people)                         | dismiss only — **no second menu opens, share/etc. doesn't fire** (strict; press again)   | dismiss only — no forward                                                      |
| **Escape key**                                                                                          | dismiss the **topmost** dismissable only (layer-aware)                                   | —                                                                              |
| **the menu's owner hides** (sidebar slides away via toggle / `Cmd+\` / focus mode / mobile-overlay tap) | the menu dismisses with it (it's rendered by the still-mounted sidebar; cleared on hide) | —                                                                              |

For **selects** (modal today): an outside press dismisses only — already no click-through to
ordinary elements (the modal blocks them). A select opened **inside a dialog** is its own
dismissable layer: pressing outside the select but inside the dialog dismisses **only the select**,
not the dialog. The one place the modal is (intentionally) defeated is the **canvas**: a press there
hits `MenuClickCapture` — `pointer-events: all`, which overrides the select's body-level
`pointer-events: none` — so a canvas press clears the _whole_ open stack (the select **and** any
menu it sits inside) rather than just the topmost select. That's correct: the canvas is outside
everything, and it still doesn't draw (verified by e2e).

For **dialogs** (modal today): the overlay/positioner is the press target, so a background press
dismisses the dialog with **no click-through**; Escape / background press dismisses **only the
topmost** dialog when stacked; `preventBackgroundClose` dialogs ignore the background press but still
close on Escape.

---

## The click-vs-click-drag-on-canvas nuance (do not lose this)

This is the whole reason the menus are non-modal + overlay rather than modal:

- **Click on canvas** (no movement past the drag threshold) → dismiss only, **nothing is drawn**.
- **Click-drag on canvas** → dismiss **and** the drag becomes a real canvas interaction **starting
  from the original press location** (so you can immediately draw, brush-select, or pan). The overlay
  waits for the drag threshold, then replays `pointer_down` at the start point and forwards moves.
- Over the **sidebar and editor top panels** (chrome), both click and drag are dismiss-only (no forward).

A modal approach **cannot** express this: `pointer-events: none` on the body makes the canvas inert,
so the drag could never reach it. Any replacement (Base UI) must keep the canvas interactive and rely
on the region overlays for the drag-forward.

---

## What the Base UI refactor must preserve

**Behavior to replicate (was Radix-provided):**

- **Non-modal dropdown/popover:** dismiss-on-outside-press that is _passive_ — it closes the menu but
  does **not** block the page or consume the press. (The overlays add the "only dismiss" on top.)
- **Modal select:** blocks outside pointer events (no click-through) + focus trap; native-`<select>`
  feel.
- **Modal dialog:** **every stacked dialog stays modal** — never make a lower one non-modal. That one
  rule yields both behaviors below. (a) **Layer-aware** dismissal: Radix's focus-scope stack _pauses_
  lower dialogs instead of dismissing them, so Escape / a background press closes only the topmost (a
  nested select/dialog dismisses inner-first). (b) **Stays interactive**: opening a nested dialog
  doesn't collapse its parent, and the topmost dialog's controls keep responding — taps on mobile
  included. A non-modal lower dialog has no focus scope, so it dismisses on the focus shift when a
  child opens, collapsing the whole stack (and it broke nested taps on mobile). Plus a background
  overlay that is the press target, and `preventBackgroundClose` (background press ignored, Escape
  still closes).
- **Positioning:** portal into `useContainer()` (the app container), `side`/`align`/offsets, and
  `collisionPadding` so menus stay in view.

**Behavior that is already Radix-independent (keep as-is):**

- The `tlmenus` registry — `hasAnyOpenMenus()`, `clearOpenMenus()`, `addOpenMenu`/`deleteOpenMenu`,
  and the editor-context scoping (so an arg-less clear doesn't evict open dialogs registered under
  the `'tla'` context).
- The overlays (`MenuClickCapture` in the SDK; `TlaMenuClickCapture` in dotcom, covering the sidebar
  and the editor top panels) — they key off `tlmenus`, not Radix.
- The **hide-dismissal**: when the sidebar hides, its menus are cleared (they're rendered by the
  still-mounted sidebar). Driven by the sidebar's visibility flags, not by any menu library.
- The **stable global menu id** for the workspace switcher — its open state lives in `tlmenus` under
  a fixed id (not scoped to the active editor's context), so a workspace switch (editor remount +
  focus steal) does **not** dismiss it. This is the inverse invariant: a thing that must _not_
  trigger dismissal. (workspaces.spec.ts "reopening the switcher right after switching keeps it
  open".)

**Remaining gap (by design):** the dotcom chrome is fully covered — `TlaMenuClickCapture` handles the
sidebar **and** the editor's top panels, and the SDK's `MenuClickCapture` is deliberately left
untouched. So the residual gap is in the **plain SDK** (no dotcom chrome): the SDK's own top
bar/panels sit above `MenuClickCapture` (panels `300` > capture `250`) with no overlay, so a press on
them while a menu is open can still click through. Closing that means an SDK-scoped change — lifting
`MenuClickCapture` above the panels and making it region-aware (canvas → forward; chrome → dismiss
only) — out of scope here.

---

## Quick reference: where the behavior lives

- `packages/editor/src/lib/components/MenuClickCapture.tsx` — canvas overlay (dismiss + drag-forward)
- `apps/dotcom/client/src/tla/components/TlaMenuClickCapture.tsx` — shared dotcom dismiss-only overlay
- `.../TlaSidebar/components/TlaSidebarMenuClickCapture.tsx` — sidebar usage;
  `.../TlaEditor/TlaEditorTopLeftPanel.tsx` + `TlaEditorTopRightPanel.tsx` — editor top-panel usage
- `apps/dotcom/client/src/tla/components/TlaSidebar/TlaSidebar.tsx` — hide-dismissal effects
- `packages/tldraw/src/lib/ui/components/Dialogs.tsx` — modal, layer-aware dialog dismissal
- `apps/dotcom/client/src/tla/components/tla-menu/` — the dotcom menu/select primitives
- `packages/editor/src/lib/globals/menus.ts` — the `tlmenus` registry
- e2e: `apps/dotcom/client/e2e/tests/smoke/workspaces.spec.ts` (sidebar + canvas cases),
  `apps/dotcom/client/e2e/tests/ui.scenario.spec.ts` (select over the canvas; top-bar button dismiss)
- dialog dismissal (modal, layer-aware, select-in-dialog, `preventBackgroundClose`) is enforced by
  the SDK tests `packages/tldraw/src/test/ui/Dialogs.test.tsx` and
  `apps/examples/e2e/tests/test-dialogs.spec.ts`; dotcom dialogs use the same primitive
