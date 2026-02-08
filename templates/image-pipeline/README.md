# Image pipeline

A visual node-based builder for image generation pipelines, built on [tldraw](https://tldraw.dev). Connect nodes on an infinite canvas to create image generation workflows — similar to ComfyUI but built with web technologies.

![image-pipeline](https://github.com/user-attachments/assets/placeholder)

## Quick start

```bash
npx create-tldraw@latest --template image-pipeline
cd my-image-pipeline
npm install
npm run dev
```

The app works out of the box with placeholder images. To generate real images, configure one or more AI providers below.

## Stack

- **Frontend**: React + tldraw + Vite
- **Backend**: Cloudflare Workers (via `@cloudflare/vite-plugin`)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Router**: itty-router

## Setup

### Prerequisites

- Node.js 18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm i -g wrangler`)

### 1. Create R2 buckets

```bash
npx wrangler r2 bucket create image-pipeline
npx wrangler r2 bucket create image-pipeline-preview
```

These are already configured in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = 'IMAGE_BUCKET'
bucket_name = 'image-pipeline'
preview_bucket_name = 'image-pipeline-preview'
```

The production bucket is used when deployed; the preview bucket is used during `wrangler dev` / local development.

### 2. Configure AI providers

You need at least one API key to generate real images. Without any keys, the app uses gradient placeholders.

**For local development**, create a `.dev.vars` file in the project root:

```
STABILITY_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
OPENAI_API_KEY=sk-...
```

**For production**, use wrangler secrets:

```bash
npx wrangler secret put STABILITY_API_KEY
npx wrangler secret put REPLICATE_API_TOKEN
npx wrangler secret put OPENAI_API_KEY
```

### 3. Run locally

```bash
npm run dev
```

This starts Vite with the Cloudflare plugin, which runs the Worker locally alongside the frontend.

## Supported providers

### Image generation

| Provider     | Model string            | Models                                 | API key             |
| ------------ | ----------------------- | -------------------------------------- | ------------------- |
| Stability AI | `stable-diffusion:sdxl` | `sdxl`, `sd-3`, `sd-1.5`               | `STABILITY_API_KEY`    |
| Replicate    | `flux:flux-dev`         | `flux-dev`, `flux-schnell`, `flux-pro` | `REPLICATE_API_TOKEN`  |
| OpenAI       | `dalle:dall-e-3`        | `dall-e-3`, `dall-e-2`                 | `OPENAI_API_KEY`       |

### Upscaling

| Provider     | Method            | API key                |
| ------------ | ----------------- | ---------------------- |
| Replicate    | `ai_enhanced`     | `REPLICATE_API_TOKEN`  |
| Stability AI | ESRGAN (fallback) | `STABILITY_API_KEY`    |

## Node types

The pipeline editor includes 13 node types:

| Node             | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| **Model**        | Select an AI provider and model                                    |
| **Prompt**       | Text input for image generation                                    |
| **PromptConcat** | Merge prefix, main, and suffix text                                |
| **Generate**     | Execute image generation (steps, cfg scale, seed)                  |
| **ControlNet**   | Image-guided generation (canny, depth, pose, segmentation)         |
| **LoadImage**    | Import an external image                                           |
| **Preview**      | Display results inline on the canvas                               |
| **Blend**        | Composite images (mix, lighten, darken, multiply, screen, overlay) |
| **Adjust**       | Brightness, contrast, saturation, hue adjustments                  |
| **Upscale**      | 2x or 4x AI upscaling                                              |
| **Number**       | Numeric constant for reusable parameters                           |
| **Router**       | Fan-out utility with type-agnostic ports                           |
| **Iterator**     | Batch-process items through a sub-pipeline                         |

Connect nodes by dragging from an output port to an input port. Ports are color-coded by type (blue = image, purple = text, orange = model, green = number, pink = latent).

## API endpoints

The Worker exposes these endpoints:

| Method | Path                   | Description                     |
| ------ | ---------------------- | ------------------------------- |
| `POST` | `/api/generate`        | Generate an image from a prompt |
| `POST` | `/api/upscale`         | Upscale an image                |
| `POST` | `/api/images/:imageId` | Upload an image to R2           |
| `GET`  | `/api/images/:imageId` | Download an image (edge-cached) |

## Deployment

```bash
npm run build
wrangler deploy
```

This builds the frontend assets and deploys both the Worker and static files to Cloudflare.

## Project structure

```
├── wrangler.toml              # Cloudflare Worker + R2 config
├── vite.config.ts             # Vite + Cloudflare plugin
├── src/
│   ├── App.tsx                # Main tldraw canvas
│   ├── api/pipelineApi.ts     # Frontend API client
│   ├── nodes/
│   │   ├── nodeTypes.tsx      # Node type definitions
│   │   ├── NodeShapeUtil.tsx  # Canvas shape rendering
│   │   └── types/             # Individual node implementations
│   ├── execution/
│   │   └── ExecutionGraph.tsx # DAG-based pipeline execution
│   ├── connection/            # Node connection/binding system
│   ├── ports/                 # Port system and UI
│   └── templates/             # Workflow save/load
└── worker/
    ├── worker.ts              # itty-router entry point
    └── routes/
        ├── generate.ts        # Multi-provider image generation
        ├── upscale.ts         # AI upscaling
        └── images.ts          # R2 persistence + edge caching
```

## License

MIT
