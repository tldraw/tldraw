---
title: Back to content
created_at: 01/07/2025
updated_at: 01/08/2025
draft-notes: 'Restructured around the culled-vs-not-visible story. Removed code blocks and jargon. Connected visibility fix to the selection-vs-page bounds behavior.'
keywords:
  - navigation
  - culling
  - viewport
  - UX
---

It can be easy to get lost on the canvas. If a user pans far enough away from their content, it might be frustrating to traverse their way back. So we need some way to get back to content when a user is sufficiently far away - but how far would that be?

We make the "Back to content" button appear when all shapes on the page are outside the viewport. When clicked, it animates the camera to bring the content back into view, zooming to fit the selection bounds (if any shapes are selected) or the page bounds (if nothing is selected).

We already track which shapes are outside the viewport for rendering performance—we skip drawing shapes you can't see. This seemed like the obvious way to detect "lost" users: if every shape is culled, show the button.

But we hit a problem. Selected shapes are intentionally excluded from culling—we always render them so they stay visible even when you pan them off-screen. This meant if you selected some shapes and panned away, the button wouldn't appear. You'd be staring at empty canvas with no way back.

The fix was to track visibility separately from culling. Now we check whether shapes are geometrically outside the viewport, regardless of whether we're actually rendering them. The culling system asks "should I draw this?" The visibility system asks "can the user see this?" 

This also means we can be smart about where to go back to. When you click the button, we zoom to the selection bounds if you have shapes selected, or the page bounds if you don't. If you selected something and panned away, you probably want to return to that specific thing—not to everything on the canvas. Draw a single rectangle and pan away? You'll jump back to that rectangle, centered on screen.

The button needs to respond immediately when you pan away—a one-frame delay would feel broken. But checking visibility on every viewport change could cause the button to flicker during rapid panning.

We track the current visibility in a ref, and only update React state when the visibility actually changes. The ref gives us a synchronous check without triggering re-renders; the state triggers the actual render when needed.
