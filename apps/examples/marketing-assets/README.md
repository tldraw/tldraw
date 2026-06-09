<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This example turns the infinite canvas into a campaign workspace: generate a **batch of ideas** for a channel, mark up the ones that work, generate a fresh batch that builds on your feedback, repeat until you're happy, then export the winners. It runs on-brand backgrounds through an image model and lays the copy over them deterministically, so the text stays legible and on-message. Refinement happens directly on the [tldraw](https://github.com/tldraw/tldraw) canvas — drawing arrows and notes, liking and disliking ideas, or ringing an area to riff on.

It's **multiplayer**: each canvas is a room (the room id is in the URL), so you can share the link and design a campaign together in real time. The board syncs through a self-hosted Cloudflare backend in the same worker that runs the AI.

## How it works

An asset is a **text-free background** from the image model with **text layers** the app renders deterministically on top — so the copy is always legible, on-brand, and stable, and it never gets reinvented or misaligned by the image model.

1. **Brand** — colours, fonts, tone, tone of voice, density, a logo, and reference images, configured in the sidebar. The brand is saved as your reusable company defaults (in `localStorage`) and seeds every new room; it's sent to the models as prompt text plus reference images.
2. **Brief** — describe the campaign, pick a channel format (LinkedIn, Instagram, …), and choose how many ideas to generate. Optionally ask for **clarifying questions** first, and add a reference image. Generating lays out a grid of frames on the canvas and fills them in parallel: Gemini renders each text-free background, then Claude lays out the text layers (content, position, font, colour, contrast scrim) and the app draws them with real fonts. Each tile gets a different direction so the batch spreads across the design space.
3. **Review** — **like** or **dislike** ideas (👍/👎 under each frame), and annotate any asset with the **Annotate** tool (toolbar, shortcut `K`) to ring an area and drop a note, or with standard tldraw arrows and text.
4. **Refine** — generate a **next batch** that feeds your liked ideas back as references and folds your dislikes and written feedback into the guidance, or select a region of the canvas and **make variations** from it. Each round lands below the last, so the canvas reads as a top-to-bottom history of the campaign. Iterate as many times as you like.
5. **Re-render** — to fine-tune one asset, annotate it and hit re-render: Claude (vision) **updates the text layers directly** (no image model — so text edits are exact and can't drift) and hands back only the _background_ changes, applied one pass each. Every render is kept in a per-asset version timeline you can revert to.
6. **Export** — download your liked (or selected, or all) assets as a zip: a full-resolution PNG per idea plus a `copy.csv` listing every text layer, ready to drop into an ad platform.
7. **Collaborate** — the whole board (assets, brand, versions, annotations, verdicts) lives in a shared room and syncs in real time. Hit **Copy link** in the sidebar and send it to a teammate. Generated backgrounds are uploaded to object storage (R2) and referenced by URL, so they're not synced inline.

See `CONTEXT.md` for the project glossary and `docs/adr/` for the key design decisions. Multiplayer follows tldraw's [sync](https://tldraw.dev/docs/sync) stack; the [`sync-cloudflare`](../../../templates/sync-cloudflare) template is the minimal reference for the same backend.

## Environment setup

Create a `.dev.vars` file in the root directory (copy `.dev.vars.example`) and add your API keys:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- `GOOGLE_GENERATIVE_AI_API_KEY` drives the background image generation. Get one from [Google AI Studio](https://aistudio.google.com/apikey).
- `ANTHROPIC_API_KEY` drives the text planner. Get one from the [Anthropic console](https://console.anthropic.com/settings/keys).

Without these, generation and re-render requests will fail with an error shown on the asset.

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser. You'll be sent to a room URL like `/room-…`; open that same URL in another tab or browser to see live collaboration. Locally, room storage (the Durable Object's SQLite) and asset storage (R2) are emulated by Wrangler — no setup needed.

## Deploying

The worker hosts the rooms (a Durable Object per room) and the asset bucket. Before the first deploy, create the R2 bucket referenced in `wrangler.toml`:

```
wrangler r2 bucket create marketing-assets
wrangler r2 bucket create marketing-assets-preview
```

Set the API keys as secrets (`wrangler secret put ANTHROPIC_API_KEY`, `wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY`), then `wrangler deploy`.

## Using another provider

Both stages are provider-abstracted. The background image provider lives in `worker/providers/gemini.ts` and the text-planning provider in `worker/providers/anthropic.ts`; both are resolved in `worker/providers/index.ts`. To swap a vendor, add a new provider that implements `ImageProvider` or `PlanProvider` and return it from `getImageProvider` / `getPlanProvider`.
