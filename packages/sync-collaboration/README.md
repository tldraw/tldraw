# @tldraw/sync-collaboration

Server-side logic for tldraw's collaboration features: write authorization for comment, comment-thread, and comment-reaction records, for use with a sync server's `authorizeRecord` option (see `TLSocketRoom` in `@tldraw/sync-core`). This package has no react or client-editor dependencies, so it is safe to import from workers and node servers.

See [tldraw.dev](https://tldraw.dev) for docs. License: see `LICENSE.md`.
