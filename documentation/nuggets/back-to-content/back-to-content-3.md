---
title: Back to content
created_at: 01/07/2025
updated_at: 01/08/2025
draft-notes: 'More matter-of-fact tone. Removed self-congratulatory language. Compressed.'
keywords:
  - navigation
  - culling
  - viewport
  - UX
---

It can be easy to get lost on the canvas. If a user pans far enough away from their content, it might be frustrating to traverse their way back. So we need some way to get back to content when a user is sufficiently far away—but how far would that be?

We make the "Back to content" button appear when all shapes on the page are outside the viewport. When clicked, it animates the camera to bring the content back into view.

We already track which shapes are outside the viewport for rendering performance—we skip drawing shapes you can't see. This seemed like the obvious way to detect lost users: if every shape is culled, show the button.

But we hit a problem. Selected shapes are intentionally excluded from culling—we always render them so they stay visible even when you pan them off-screen. This meant if you selected some shapes and panned away, the button wouldn't appear. You'd be staring at empty canvas with no way back.

The fix was to track visibility separately from culling. Now we check whether shapes are geometrically outside the viewport, regardless of whether we're rendering them. When clicked, the button zooms to the selection bounds if shapes are selected, otherwise the page bounds.

The button needs to respond immediately when you pan away—a one-frame delay would feel broken. But checking visibility on every viewport change could cause the button to flicker during rapid panning. We track visibility in a ref, and only update React state when the value actually changes.
