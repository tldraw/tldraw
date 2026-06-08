<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This starter kit generates on-brand marketing assets with an image model, then lets you refine them by drawing arrows and text directly on the [tldraw](https://github.com/tldraw/tldraw) canvas. You configure a brand, write a brief, pick an output format, and generate. To revise an asset, annotate it and hit re-render — the annotations are read by a vision model and turned into a precise edit, and every render is kept in a per-asset version history you can revert to.

## How it works

An asset is a **text-free background** from the image model with **text layers** the app renders deterministically on top — so the copy is always legible, on-brand, and stable, and it never gets reinvented or misaligned by the image model.

1. **Brand** — colours, fonts, tone, density, a logo, and reference images, configured in the sidebar. One brand applies to every asset and is sent to the models as prompt text plus reference images.
2. **Generate** — a brief, an output type (Instagram square, story, …), and an optional reference image produce an asset in a frame: Gemini renders a text-free background, then Claude lays out the text layers over it (content, position, font, colour, contrast scrim) and the app draws them with real fonts.
3. **Annotate** — mark up an asset. Use the **Annotate** tool (in the toolbar, shortcut `K`) to ring an area with an oval and get an arrow plus a ready-to-type note in one gesture, or draw standard tldraw arrows and text by hand. Arrows point at what to change; text says how.
4. **Re-render** — Claude (vision) reads the annotated asset, **updates the text layers directly** (no image model — so text edits are exact and can't drift), and hands back only the *background* changes. Those are applied to the background one pass each (the asset shows the step count while it works).
5. **History** — every render is appended to the asset's version timeline (background + text layers), shown as thumbnails under the frame. Click any version to revert. Everything is stored in the tldraw document and persists across reloads.

See `CONTEXT.md` for the project glossary and `docs/adr/` for the key design decisions.

## Environment setup

Create a `.dev.vars` file in the root directory (copy `.dev.vars.example`) and add your API keys:

```
GOOGLE_API_KEY=your_google_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- `GOOGLE_API_KEY` drives the background image generation. Get one from [Google AI Studio](https://aistudio.google.com/apikey).
- `ANTHROPIC_API_KEY` drives the text planner. Get one from the [Anthropic console](https://console.anthropic.com/settings/keys).

Without these, generation and re-render requests will fail with an error shown on the asset.

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser to see the app.

## Using another provider

Both stages are provider-abstracted. The background image provider lives in `worker/providers/gemini.ts` and the text-planning provider in `worker/providers/anthropic.ts`; both are resolved in `worker/providers/index.ts`. To swap a vendor, add a new provider that implements `ImageProvider` or `PlanProvider` and return it from `getImageProvider` / `getPlanProvider`.
