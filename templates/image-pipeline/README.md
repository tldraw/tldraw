# Image pipeline

A visual node-graph editor for building AI image and text workflows on top of [tldraw](https://tldraw.dev).  
Users place nodes on an infinite canvas, connect typed ports, run a DAG execution graph, and inspect outputs inline.

## Quick start

```bash
npx create-tldraw@latest --template image-pipeline
cd my-image-pipeline
npm install
npm run dev
```

The template works without backend keys by returning local placeholders.

## Stack

- Frontend: React + tldraw + Vite
- Backend: Cloudflare Worker (`itty-router`)
- Storage: Cloudflare R2 for optional image persistence

## Features

- Two-pane UI: fixed node library sidebar + canvas
- Typed ports with compatibility checks (`image`, `text`, `model`, `number`, `latent`, `any`)
- Cycle prevention while connecting
- On-canvas node picker from connection gestures
- Region overlays with play/stop controls
- Per-node “Play from here”
- Template save/stamp system (localStorage)
- Download image / copy text / clear result actions
- Local canvas persistence (`persistenceKey: image-pipeline`)

## Setup

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI (optional globally): `npm i -g wrangler`

### Configure R2 buckets

```bash
npx wrangler r2 bucket create image-pipeline
npx wrangler r2 bucket create image-pipeline-preview
```

`wrangler.toml` already binds:

```toml
[[r2_buckets]]
binding = "IMAGE_BUCKET"
bucket_name = "image-pipeline"
preview_bucket_name = "image-pipeline-preview"
```

### Configure API key

For real model calls, set `REPLICATE_API_TOKEN`.

Local development (`.dev.vars`):

```bash
REPLICATE_API_TOKEN=...
```

Production:

```bash
npx wrangler secret put REPLICATE_API_TOKEN
```

Without a token, worker endpoints return placeholders for supported routes.

## Models and providers

Primary provider is Replicate, selected via `provider:modelId` from the Model node.

- Flux: `flux-dev`, `flux-schnell`, `flux-pro`
- Stable Diffusion: `sdxl`, `sd-3`
- Google: `nano-banana-pro`, `nano-banana`, `imagen-4-fast`
- ControlNet maps mode to Flux ControlNet variants (`canny`, `depth`, `pose`, `segmentation`)
- Upscaling uses `nightmareai/real-esrgan`
- Text generation uses Replicate-hosted Gemini

## Worker API

- `POST /api/generate`
- `POST /api/upscale`
- `POST /api/ip-adapter`
- `POST /api/style-transfer`
- `POST /api/generate-text`
- `POST /api/images/:imageId`
- `GET /api/images/:imageId`

Image downloads are edge-cached with immutable cache headers.

## Node types

- Model
- Prompt
- Prompt Concat
- Generate
- ControlNet
- Load Image
- Preview
- Blend
- Adjust
- Upscale
- Number
- Router
- Iterator
- Generate Text
- Style Transfer
- IP-Adapter

## Build and deploy

```bash
npm run build
npx wrangler deploy
```
