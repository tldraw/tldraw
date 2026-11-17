# @tldraw/permissions

Grants for the tldraw editor (`tl:shape:create:geo`, `tl:shape:*@page:A`, ...), the pure functions that judge an action or a record change against a list of them, `createGrantsPolicy` (one object for a sync room's `authorize`, `useSync` and the store, so the room and the UI follow the same grants), and helpers for writing your own rules (`composeRules`, `getOwningPage`, `getOwningAncestor`). Everything here is pure and runs the same on the client and the server.
