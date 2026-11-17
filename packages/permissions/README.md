# @tldraw/permissions

A permission store and default authorize hooks for tldraw. `createPermissions()` returns `permissions`, which keeps the permissions each user has and answers `can(userId, permission, data)`, and `authorize`, the hooks to pass to `TLSocketRoom` and `<Tldraw>`. The same code runs on the client and the server.

`authorize.write` checks each change with `ctx.can`, so a rule you add to `can` with `composeAuthorize` applies to writes in the room too.
