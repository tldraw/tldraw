---
title: Signals
component: ./StateStoreExample.tsx
priority: 0
keywords:
  [signals, reactive, track, usevalue, usereactor, state management, side effects, computed, atom]
---

Keep React components and side effects in sync with editor state using `track`, `useValue`, and `useReactor`.

---

tldraw's editor state is made of signals: every `editor.get...()` call reads one. This example shows
the three main ways to react to them from a component. `track` wraps a component so it re-renders
when any signal it read during render changes. `useValue` subscribes to just the return value of a
function. `useReactor` runs a side effect (here, updating the document title with the shape count)
whenever the signals it reads change.

Try switching tools, zooming, and adding shapes: the panel above the style panel and the browser
tab title both update. The file includes two versions of the panel, one using `track` and one using
`useValue`, that behave the same way.
