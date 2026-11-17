---
title: Assigned pages
component: ./AssignedPagesExample.tsx
priority: 5
keywords: [permissions, grants, policy, authorize, pages, classroom, readonly, isPermitted]
---

Let a student draw on their own page only, with grants and a shared policy and no UI code.

---

A grant is a permission name with an optional place: `page:edit@page:A` holds on page A and everything on it. The policy's `requires` table says every shape action also needs `page:edit` at the same place, so a student granted `tl:shape:*` and `page:edit@page:A` can draw on page A and nowhere else.

The same policy object goes to the store here, and to `TLSocketRoom` and `useSync` in a multiplayer app. The editor reads its `requires` to answer `editor.isPermitted`, so the toolbar, the style panel and the actions on a selected shape follow the grants on each page without any `isPermitted` callback. The write rule still judges every change, whatever the buttons say: as the student, push a shape onto page B and the refusal shows at the top.
