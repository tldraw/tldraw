# dotcom

## Development

You'll need a clerk publishable and secret key.

In `sync-worker/.dev.vars`, set `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`. In `client/.env.local`, set `VITE_CLERK_PUBLISHABLE_KEY`.

Run the full stack in Docker from the repo root:

```bash
yarn dev-app
```

This starts the whole stack — client, workers, zero-cache, postgres, pgbouncer — in containers. See [`docker-dev/README.md`](docker-dev/README.md) for first-run setup (the `/etc/hosts` aliases the browser needs, and how secrets flow in).

Diagnostics and reset:

```bash
yarn dev-app:doctor   # docker compose ps for the stack
yarn dev-app:clean    # tear the stack down and drop its volumes (DB + deps)
```

Browser-side state is separate. After starting the stack, visit `http://localhost:3000/dev/reset-local-state` to clear local storage, IndexedDB, caches, service workers, accessible cookies, and Clerk session state for the current origin.

### Host-native stack (`dev-app:host`)

The previous host-native stack (workers and zero-cache as host processes, postgres in Docker) is still available as a fallback and is what CI e2e uses:

```bash
yarn dev-app:host
```

Its server state is scoped to the current git branch (own Docker Compose project, Postgres volume, Zero replica file, and Wrangler state directory), and its ports are fixed, so only one host stack can run at a time.
