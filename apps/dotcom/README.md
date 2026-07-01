# dotcom

## Development

You'll need a clerk publishable and secret key.

In `sync-worker/.dev.vars`, set `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`. In `client/.env.local`, set `VITE_CLERK_PUBLISHABLE_KEY`.

The dev stack is orchestrated by [process-compose](https://github.com/F1bonacc1/process-compose). You don't need to install it — `yarn dev-app` fetches the pinned binary on first use. Run the app from the repo root:

```bash
yarn dev-app
```

This brings up the whole stack — postgres (in a container), zero-cache, the workers, and the client — as host processes. The ports are fixed, so only one dotcom dev stack can run at a time. The services and their startup order are defined in [`process-compose.yaml`](process-compose.yaml).

### Working with the stack

By default `yarn dev-app` opens the process-compose TUI, listing each service with its status, logs, and health.

- **Quit:** `F10` or `Ctrl-C`. This stops every process and runs postgres's `docker compose down` — the clean way to stop. Closing the terminal tab instead can leave the postgres container and stray workers running.
- **Inspect a service:** select it with the arrow keys to see its logs; press `F1` for the full key bindings (start / stop / restart a selected process).
- **Plain interleaved logs, no TUI:** `PC_DISABLE_TUI=1 yarn dev-app` streams every service's logs to stdout (this is also how it runs in CI).
- **Drive it from another terminal or a script** — the `process-compose` client connects to the running stack:

  ```bash
  yarn dev-app:doctor                                       # status of every service
  yarn exec process-compose process logs zero-cache --tail 200
  yarn exec process-compose process restart sync-worker
  ```

- **Reset server state:** `yarn dev-app:clean` tears down the postgres container + volume, the zero replica, and wrangler state.

Browser-side state is separate. After starting the stack, visit `http://localhost:3000/dev/reset-local-state` to clear local storage, IndexedDB, caches, service workers, accessible cookies, and Clerk session state for the current origin.
