---
title: Permissions
component: ./PermissionsExample.tsx
category: events
priority: 8
keywords:
  - permissions
  - effect
  - side
  - user
---

Create a hacky version of permissions in tldraw using `meta` properties and side effects.

---

While there isn't (yet) a permissions API in tldraw, you can achieve a similar effect using shape `meta` tags and side effects.

In this example, a shape can only be updated for five seconds after it is created. It can only be deleted _after_ five seconds. To achieve this, we'll store a `createdAt` time on each shape and then use this time to prevent certain changes or deletes. You might use a similar system to stash a `createdBy` properties on the shape's `meta` object and then prevent users from deleting or changing shapes that they didn't create.
