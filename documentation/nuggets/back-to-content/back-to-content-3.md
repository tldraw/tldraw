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
readability: 8
voice: 9
potential: 6
accuracy: 7
notes: "Clean voice, no AI tells. But the 'selected shapes excluded from culling' claim doesn't match code—notVisibleShapes uses canCull(), not selection. Potential limited: problem isn't surprising enough."
---

It can be easy to get lost on the canvas. If you pan far enough away from your content, it may be frustrating to traverse your way back. In this case, we need some quick way to get back to content.

In tldraw, we make the "Back to content" button appear when all shapes on the page are outside the viewport. When clicked, it animates the camera to bring the content back into view. How exactly do we do this?

We already track which shapes are outside the viewport for rendering performance—we skip drawing shapes you can't see. This seemed like the obvious way to detect lost users: if every shape is culled, show the button.

But we hit a problem. Selected shapes are intentionally excluded from culling—we always render them so they stay visible even when you pan them off-screen. This meant if you selected some shapes and panned away, the button wouldn't appear.

The fix was to track visibility separately from culling. Now we check whether shapes are geometrically outside the viewport, regardless of whether we're rendering them. When clicked, the button zooms to the selection bounds if shapes are selected, and if not, it zooms to the page bounds.

The button needs to respond immediately when you pan away—a one-frame delay would feel broken. But checking visibility on every viewport change could cause the button to flicker during rapid panning. We track visibility in a ref, and only update React state when the value actually changes.
