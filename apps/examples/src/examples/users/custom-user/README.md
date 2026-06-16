---
title: Custom user metadata
component: ./CustomUserExample.tsx
priority: 3
keywords:
  [
    user,
    custom,
    meta,
    metadata,
    isAdmin,
    department,
    TLUser,
    TLUserStore,
    createTLSchema,
    createUserRecordType,
    extensibility,
  ]
---

Extend user records with custom metadata fields like roles and departments.

---

This example shows how to store custom metadata on `TLUser` records. Each user has `isAdmin` and `department` fields in their `meta` object. Switch between users at the top to see their custom metadata displayed in the side panel.

For runtime validation of custom meta fields, pass validators to `createTLSchema`:

```ts
const schema = createTLSchema({
	user: {
		meta: {
			isAdmin: T.boolean,
			department: T.string,
		},
	},
})
```
