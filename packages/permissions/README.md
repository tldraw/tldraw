# @tldraw/permissions

Named permissions for the tldraw editor (`tl:shape:create`, `tl:page:delete`, ...), the pure functions that judge a record change against a list of them, and helpers for writing a sync room's `authorize` rule (`composeRules`, `getOwningPage`, `getOwningAncestor`). Everything here is pure and runs the same on the client and the server.
