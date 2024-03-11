# Repo-tools

Repo-tools is responsible for the huppy-bot app.

## Development

To develop huppy-bot, you'll need to create a .env file that looks like this:

```
REPO_SYNC_PRIVATE_KEY_B64=<base64 encoded private key here>
REPO_SYNC_HOOK_SECRET=<hook secret here>
```

DM alex to get hold of these credentials.

To start the server, run `yarn dev-huppy`. Once running, you can go to
http://localhost:3000/deliveries to get to a list of github webhook event
deliveries. To test your code, pick an event that does roughly what you want and
hit 'simulate'. You can also ask GitHub to re-deliver events to the production
version of repo-sync through this UI.

Huppy-bot isn't currently deployed automatically. To deploy, use:

```sh
fly deploy --config apps/huppy/fly.toml --dockerfile apps/huppy/Dockerfile
```

from the repo root.

## How it works

Huppy runs on a server with persistent disk storage attached. It maintains local
mirrors of both our github repos on that disk. When events come in that mean we
need to do some work in a repo, it updates the local mirror, then clones them to
a temporary directory for work. This sort of pull + local clone is _much_ faster
(~1s) than normal from-scratch clones (~1m).

Huppy's reponsibilities are organized into "flows". These are defined in
`src/flows`. A flow is an object with webhook handlers that implement some
complete set of functionality. Right now there aren't many, but we could add more!

There's an alternative universe where huppy would exist as a set of github
actions instead. We didn't pursue this route for three reasons:

1. Huppy needs to operate over multiple github repos at once, which isn't well
   supported by actions.
2. Giving actions in our public repo access to our private repo could be a
   security risk. We'd have to grant permission to OSS contributors to run
   certain actions, which could mean accidentally giving them access to more
   than we intend.
3. Having access to the full range of webhook & API options provided by GitHub
   means we can create a better DX than would be possible with plain actions
   (e.g. the "Fix" button when huppy detects that bublic is out of date).

It also lets us make use of that local-clone trick, which means huppy responds
to requests in seconds rather than minutes.
