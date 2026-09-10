---
title: Attribution
component: ./AttributionExample.tsx
priority: 6
keywords: [identity, user, attribution, TLUserStore]
---

Connect tldraw to your user system with a `TLUserStore` and record who created each shape.

---

The `TLUserStore` passed to the `users` prop answers two questions for the editor: who is the current user, and how to look up a user by id. Both are reactive signals, so display names and colors update live. The editor uses it for built-in attribution such as `textLastEditedBy` on note shapes, and `editor.getAttributionUserId()` gives you the same id to stamp onto your own data. This example adds a `beforeCreate` side effect that writes it to `meta.createdBy` on every new shape.

Use the buttons at the top to switch between Alice, Bob, and Carol. Draw shapes as different users, then select one to see who created it in the panel on the right. Rename the active user in the text field and watch the attribution update.
