# tldraw video chat

A multiplayer whiteboard with built-in video chat, powered by [tldraw sync](https://tldraw.dev/docs/sync) and [Cloudflare Calls](https://developers.cloudflare.com/realtime/sfu/).

- Whiteboard collaboration via WebSockets and [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) (same architecture as the [multiplayer template](https://github.com/tldraw/tldraw-sync-cloudflare))
- Video and audio chat via [Cloudflare Calls SFU](https://developers.cloudflare.com/realtime/sfu/) (WebRTC)
- Track metadata is broadcast through tldraw's presence system, so participants auto-discover each other's streams
- Floating video tiles overlaid on the canvas with mute, camera, and leave controls

## Prerequisites

You'll need a Cloudflare account with:

1. An **R2 bucket** for asset storage (images, videos)
2. A **Calls app** for WebRTC — create one at [dash.cloudflare.com](https://dash.cloudflare.com) → Realtime → SFU

## Setup

Install dependencies:

```sh
npm install
```

Create a `.dev.vars` file (or use `wrangler secret put`) with your Calls app secret:

```
CALLS_APP_SECRET=your-secret-here
```

Update `CALLS_APP_ID` in [`wrangler.toml`](./wrangler.toml) with your own app ID.

## Development

Start the local development server:

```sh
npm run dev
```

This starts a [`vite`](https://vitejs.dev/) dev server running both the frontend and the Cloudflare Workers backend via the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/).

Open two browser tabs to the same room URL. Click "Join video" in both tabs to start a video chat while collaborating on the whiteboard.

## How it works

### Whiteboard sync

Same as the [multiplayer template](https://github.com/tldraw/tldraw-sync-cloudflare): each room is a Durable Object that manages a `TLSocketRoom` with SQLite-backed storage. Clients connect via `useSync()` over WebSockets.

### Video chat

The video chat layer uses Cloudflare Calls as a Selective Forwarding Unit (SFU):

1. When a user clicks "Join video", the client requests camera/mic access and creates a Calls session via the worker
2. Local audio/video tracks are pushed to the SFU through an `RTCPeerConnection`
3. The user's Calls session ID and track names are written to their tldraw presence record's `meta` field
4. Other clients read the presence `meta` to discover remote tracks, then create pull peer connections to subscribe to them via the SFU
5. Remote video feeds appear as floating tiles in the bottom-right corner of the canvas

The worker proxies all Calls API requests to keep the app secret server-side.

### File structure

**Backend** ([`worker/`](./worker/)):

- **[`worker/worker.ts`](./worker/worker.ts):** routes for whiteboard sync, asset uploads, bookmark unfurling, and Cloudflare Calls API proxy
- **[`worker/TldrawDurableObject.ts`](./worker/TldrawDurableObject.ts):** the sync Durable Object, one per active room
- **[`worker/assetUploads.ts`](./worker/assetUploads.ts):** uploads, downloads, and caching for images and videos

**Frontend** ([`client/`](./client/)):

- **[`client/pages/Room.tsx`](./client/pages/Room.tsx):** main room component with `useSync` and custom `getUserPresence` to broadcast track metadata
- **[`client/hooks/useVideoChat.ts`](./client/hooks/useVideoChat.ts):** core video chat hook — manages getUserMedia, push/pull RTCPeerConnections, and track lifecycle
- **[`client/hooks/callsApi.ts`](./client/hooks/callsApi.ts):** typed client wrapper for the proxied Cloudflare Calls REST API
- **[`client/components/VideoOverlay.tsx`](./client/components/VideoOverlay.tsx):** floating video overlay that polls presence for remote participants
- **[`client/components/ParticipantTile.tsx`](./client/components/ParticipantTile.tsx):** individual video feed with avatar fallback
- **[`client/components/MediaControls.tsx`](./client/components/MediaControls.tsx):** mute, camera toggle, and leave buttons

## Custom shapes

To add support for custom shapes, see the [tldraw sync custom shapes docs](https://tldraw.dev/docs/sync#Custom-shapes--bindings).

## Deployment

Update the R2 bucket name and Calls app ID in [`wrangler.toml`](./wrangler.toml), then set your Calls secret:

```sh
wrangler secret put CALLS_APP_SECRET
```

Build and deploy:

```sh
npm run build
npx wrangler deploy
```

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/video-chat-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).
