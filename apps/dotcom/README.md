# dotcom

## Development

You'll need a clerk publishable and secret key.

In `sync-worker/.dev.vars`, set `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`. In `client/.env.local`, set `VITE_CLERK_PUBLISHABLE_KEY`.

Run the app from the repo root:

```bash
yarn dev-app
```

Local server state is scoped to the current git branch. Each branch gets its own Docker Compose project, Postgres volume, Zero replica file, and Wrangler state directory. The ports are still fixed, so only one dotcom dev stack can run at a time.

For diagnostics, run:

```bash
yarn dev-app:doctor
```

To reset the current branch's server-side state, run:

```bash
yarn dev-app:clean
```

Each branch's Postgres volume starts at roughly 40-50 MB before much user data, so this state can add up if you work across many branches. To remove dotcom dev server state for every branch, stop `yarn dev-app` and run:

```bash
yarn dev-app:clean:all
```

Browser-side state is separate. After starting `yarn dev-app`, visit `http://localhost:3000/dev/reset-local-state` to clear local storage, IndexedDB, caches, service workers, accessible cookies, and Clerk session state for the current origin.
