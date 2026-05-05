# dotcom

## development

You'll need a clerk publishable and secret key.

In `sync-worker/.dev.vars`, set `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`. In `client/.env.local`, set `VITE_CLERK_PUBLISHABLE_KEY`.

Having trouble getting started? Maybe an old build on your machine? Run `cd apps/dotcom/zero-cache && yarn clean && cd ../../../`.
