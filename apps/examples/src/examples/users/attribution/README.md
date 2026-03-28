---
title: Attribution
component: ./AttributionExample.tsx
priority: 6
keywords: [identity, user, attribution, TLUserStore]
---

Providing a custom `TLUserStore` to connect tldraw to your auth system.

---

The `TLUserStore` interface tells the editor "who is the current user?" and "how do I look up a user by ID?". The editor uses it to track the current user for attribution — for example, note shapes display who first edited their text.

In this example we define a custom `TLUserStore` backed by a fake user directory. Buttons at the top let you switch users. Draw shapes as different users, then select them to inspect attribution metadata in the panel on the right.
