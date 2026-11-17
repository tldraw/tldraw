# @tldraw/sync-collaboration

Server-side logic for tldraw's collaboration features: write rules for comment, comment-thread, and comment-reaction records. `createCommentAuthorize` returns them as an `authorize` hook to combine with your own through `composeAuthorize` and pass to `TLSocketRoom` and the client. `createCommentAuthorizers` returns them for the deprecated `authorizeRecord` option. This package has no react or client-editor dependencies, so it is safe to import from workers and node servers.

See [tldraw.dev](https://tldraw.dev) for docs. License: see `LICENSE.md`.
