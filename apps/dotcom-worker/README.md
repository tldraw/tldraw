# @tldraw/tlsync-worker

## Enable database persistence for local dev

The values for `env.SUPABASE_KEY` and `env.SUPABASE_URL` are stored in the Cloudflare Workers dashboard for this worker. However we use `--local` mode for local development, which doesn't read these values from the dashboard.

To workaround this, create a file called `.dev.vars` under `merge-server` with the required values (which you can currently find at https://app.supabase.com/project/bfcjbbjqflgfzxhskwct/settings/api). This will be read by `wrangler dev --local` and used to populate the environment variables.

```
SUPABASE_URL=<url>
SUPABASE_KEY=<key>
```
