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
- `MenuClickCapture` (SDK) is `position: fixed; inset: 0` and its z-index (`250`) lives **inside the
  editor's** stacking context, so it covers the canvas. It owns the canvas press (dismiss + drag).
- `useMenuClickCapture` (dotcom) is **not a layer** — it's a set of capture-phase document listeners,
  so it has no z-index and doesn't appear in this stacking model at all. That's deliberate: a single
  app-level _overlay_ can't work here, because the editor's panels **and** its menus both live inside
  one `canvas-in-front` stacking context (z 250) while the sidebar is a separate one — so there is no
  single app-level z that sits above all chrome yet below all menus (an overlay high enough to cover
  the top-bar chrome also covers the open menus). A listener avoids the stacking question entirely.

---

## The dismiss mechanism (how "press only dismisses" is achieved on non-modal menus)

Two cooperating pieces, both keyed only off **`tlmenus.hasAnyOpenMenus()`** and dismissing via
**`tlmenus.clearOpenMenus()`** — so they're independent of Radix and survive the Base UI refactor:

- **`MenuClickCapture` (SDK, the canvas).** A real overlay at z `250` covering the canvas. On a click
  it dismisses and swallows; on a click-**drag** it dismisses **and forwards** a `pointer_down` to the
  canvas at the original press point, then forwards moves — so the drag draws/selects/pans. This is
  why the menus are non-modal: only a live canvas can take the drag.
- **`useMenuClickCapture` (dotcom, everything else).** A single set of **capture-phase document
  listeners** (`pointerdown`, `click`, `contextmenu`), installed once at the app root (`TlaRootProviders`,
  so it covers every page — including editor pages with no sidebar) — _not_ an overlay. While a menu is open it
  reads the element under each press (`event.target`, i.e. the browser's own hit result) and:
  - **canvas** (`.tl-canvas` / `.tlui-menu-click-capture`) → does nothing; the SDK overlay above
    handles it (so click-to-draw and drag are untouched, mouse **and** touch).
  - **inside an open menu / dialog / popover / select** (`[data-radix-popper-content-wrapper]`,
    `[role="menu" | "dialog" | "listbox"]`) → does nothing; the press works normally.
  - **anything else (chrome)** → `preventDefault` + `stopPropagation` + `clearOpenMenus()`, dismiss
    only. The `click` the press would spawn is cancelled too (a chrome press lands on the chrome
    element itself, unlike an overlay where down/up land on different nodes and no click forms).

The listeners stay attached regardless of menu state, gated internally by `hasAnyOpenMenus()`, so the
follow-up `click` is still suppressed after `clearOpenMenus()` has unmounted the menu. The dismiss is
explicit because `stopPropagation` would otherwise stop Radix's own outside-detection.

Why a listener and not one app-wide overlay: see the z-index note above — no single app-level z sits
above all chrome but below all menus, so an overlay either covers the menus or misses the chrome. A
listener sidesteps stacking entirely and classifies by the real hit target, which also makes touch
behave exactly like mouse (no cursor-tracking needed).

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
- The dismiss mechanism keys off `tlmenus`, not Radix: the SDK's `MenuClickCapture` overlay (canvas)
  and dotcom's `useMenuClickCapture` document listeners (everything else). One Radix-specific detail
  to re-point under Base UI: the listener recognises "inside an open dismissable" via Radix selectors
  (`[data-radix-popper-content-wrapper]`, `[role="menu" | "dialog" | "listbox"]`); update that set to
  Base UI's equivalents. The canvas selectors (`.tl-canvas` / `.tlui-menu-click-capture`) are SDK and
  unchanged.
- **Keep the dotcom listener at the app level** (a hook at `TlaRootProviders`), _not_ folded into the
  SDK's `MenuClickCapture` component. That consolidation is tempting — the SDK component already has
  `editor.menus` and could host the same listener — but the SDK component only mounts where there's an
  editor. A hook at the app root carries the core invariant (_a press outside a dismissable only
  dismisses, never interacts with what's underneath_) to **any** dotcom page, including future
  non-canvas pages with no editor. So: the SDK keeps its canvas overlay; dotcom keeps the app-wide
  listener.
- The **hide-dismissal**: when the sidebar hides, its menus are cleared (they're rendered by the
  still-mounted sidebar). Driven by the sidebar's visibility flags, not by any menu library.
- The **stable global menu id** for the workspace switcher — its open state lives in `tlmenus` under
  a fixed id (not scoped to the active editor's context), so a workspace switch (editor remount +
  focus steal) does **not** dismiss it. This is the inverse invariant: a thing that must _not_
  trigger dismissal. (workspaces.spec.ts "reopening the switcher right after switching keeps it
  open".)

**Remaining gap (by design):** _all_ dotcom chrome is now covered — the listener treats everything
that isn't the canvas or an open dismissable as chrome, so the sidebar, the editor top panels, and any
future chrome are handled with no per-region wiring. The SDK's `MenuClickCapture` is deliberately left
untouched. So the residual gap is only in the **plain SDK** (no dotcom listener): the SDK's own top
bar/panels sit above `MenuClickCapture` (panels `300` > capture `250`) with no equivalent, so a press
on them while a menu is open can still click through. Closing that means an SDK-scoped change —
lifting `MenuClickCapture` above the panels and making it region-aware — out of scope here.

---

## Quick reference: where the behavior lives

- `packages/editor/src/lib/components/MenuClickCapture.tsx` — SDK canvas overlay (dismiss + drag-forward)
- `apps/dotcom/client/src/tla/hooks/useMenuClickCapture.ts` — dotcom global dismiss listeners
  (classifies each press by `event.target`); called once at the app root in
  `.../tla/providers/TlaRootProviders.tsx`
- `apps/dotcom/client/src/tla/components/TlaSidebar/TlaSidebar.tsx` — hide-dismissal effects
- `packages/tldraw/src/lib/ui/components/Dialogs.tsx` — modal, layer-aware dialog dismissal
- `apps/dotcom/client/src/tla/components/tla-menu/` — the dotcom menu/select primitives
- `packages/editor/src/lib/globals/menus.ts` — the `tlmenus` registry
- e2e: `apps/dotcom/client/e2e/tests/smoke/workspaces.spec.ts` (sidebar + canvas cases),
  `apps/dotcom/client/e2e/tests/ui.scenario.spec.ts` (select over the canvas; top-bar button dismiss)
- dialog dismissal (modal, layer-aware, select-in-dialog, `preventBackgroundClose`) is enforced by
  the SDK tests `packages/tldraw/src/test/ui/Dialogs.test.tsx` and
  `apps/examples/e2e/tests/test-dialogs.spec.ts`; dotcom dialogs use the same primitive
