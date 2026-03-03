---
title: Identity
component: ./IdentityExample.tsx
priority: 6
keywords: [identity, user, attribution, tlmeta, createdBy, updatedBy, TLIdentityProvider]
---

Providing a custom `TLIdentityProvider` to connect tldraw to your auth system.

---

The `TLIdentityProvider` interface tells the editor "who is the current user?" and "how do I look up a user by ID?". The editor uses it to stamp attribution metadata (`tlmeta`) on shapes — recording who created and last updated each shape — and to resolve user IDs back to display names and colors.

In this example we define a custom `TLIdentityProvider` backed by a fake user directory. Buttons at the top let you switch users. Draw shapes as different users, then select them to inspect their attribution metadata in the panel on the right.

