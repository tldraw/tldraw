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

Store app-specific fields like roles and departments in `TLUser.meta`.

---

`TLUser` records have a `meta` field for your own data. This example gives each user an `isAdmin` flag and a `department`, provides them through a `TLUserStore`, and reads them back in a side panel. Switch users with the buttons at the top to see the panel update.

`meta` is untyped JSON, so the example casts to a local interface when reading. For runtime validation, pass validators to `createTLSchema` and hand the resulting schema to your store:

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
