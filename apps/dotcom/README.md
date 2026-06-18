# dotcom

## Development

You'll need a clerk publishable and secret key.

In `sync-worker/.dev.vars`, set `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`. In `client/.env.local`, set `VITE_CLERK_PUBLISHABLE_KEY`.

The dev stack is orchestrated by [process-compose](https://github.com/F1bonacc1/process-compose), a single static binary. Install it once:

```bash
brew install f1bonacc1/tap/process-compose
```

Then run the app from the repo root:

```bash
yarn dev-app
```

This brings up the whole stack — postgres (in a container), zero-cache, the workers, and the client — as host processes, with a TUI showing each service's status, logs, and health. The ports are fixed, so only one dotcom dev stack can run at a time. See [`process-compose.yaml`](process-compose.yaml) and [`README.process-compose.md`](README.process-compose.md).

Diagnostics and reset:

```bash
yarn dev-app:doctor   # list process state
yarn dev-app:clean    # tear down the postgres container + volume, zero replica, and wrangler state
```

Browser-side state is separate. After starting the stack, visit `http://localhost:3000/dev/reset-local-state` to clear local storage, IndexedDB, caches, service workers, accessible cookies, and Clerk session state for the current origin.
