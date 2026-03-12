---
title: Identity
component: ./IdentityExample.tsx
priority: 6
keywords: [identity, user, attribution, tlmeta, createdBy, updatedBy, TLUserStore]
---

Providing a custom `TLUserStore` to connect tldraw to your auth system.

---

The `TLUserStore` interface tells the editor "who is the current user?" and "how do I look up a user by ID?". The editor uses it to stamp attribution metadata (`meta.__tldraw`) on shapes — recording who created and last updated each shape — and to resolve user IDs back to display names.

In this example we define a custom `TLUserStore` backed by a fake user directory. Buttons at the top let you switch users. Draw shapes as different users, then select them to inspect their attribution metadata in the panel on the right.
