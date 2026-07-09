<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This starter kit is a realtime sketch-to-image generator built on [tldraw](https://github.com/tldraw/tldraw). Draw on the canvas with the draw and shape tools and watch a generated image update live beside it, powered by [fal.ai](https://fal.ai)'s Latent Consistency Models. You can then turn any generated image into a short video clip.

## Environment setup

This template uses fal.ai for generation. Create a `.dev.vars` file in this directory and add your fal.ai API key:

```
FAL_KEY=your_fal_key_here
```

You can get a key from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys). Without a key, generation requests will fail with a clear error in the panel.

The key never reaches the browser. The worker proxies every fal request and injects the key server-side. For deployment, set the key as a secret instead:

```
wrangler secret put FAL_KEY
```

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open the printed local URL in your browser, then start drawing.

## How it works

There are three main pieces:

1. **The sketch capture** (`src/realtime/captureSketch.ts`): on each canvas edit, the shapes are rasterized to a 512×512 PNG and letterboxed onto a white square — the input format the LCM model expects.
2. **The generation loop** (`src/realtime/falConnection.ts`): each captured frame is sent to fal's `fal-ai/lcm-sd15-i2i` model through the proxy. LCM returns in ~150–350ms, so with the debounced send loop the result tracks your drawing closely. Each new frame supersedes any in-flight request, so a slow response never overwrites a newer one. The `useRealtimeGeneration` hook debounces edits and wires the two together.
3. **The worker proxy** (`worker/routes/falProxy.ts`): a small Cloudflare Worker that forwards fal requests with your `FAL_KEY` attached, so the key never reaches the browser. The frontend posts to `/api/fal/proxy` with an `x-fal-target-url` header naming the fal endpoint.

### Controls

The panel on the right steers generation:

- **Prompt** — what the sketch should become.
- **Strength** — how far the model may deviate from your drawing (lower stays closer to the sketch).
- **Steps** — LCM needs very few; 4 is a good default.
- **Seed** — fix it for reproducible results.

### Animate → video

The **Animate → video** button sends the current generated image to fal's Seedance image-to-video model (`worker/routes/animate.ts`) and shows the resulting clip. Unlike the sketch loop, this is a queued, multi-second generation — a deliberate action rather than something that runs live.

## Customizing

- Swap the realtime model in `src/constants.ts` (`REALTIME_MODEL`). fal offers several LCM variants tuned for different input styles.
- Adjust the capture resolution and debounce in `src/constants.ts`.
- Change the video model in `worker/routes/animate.ts`.
- Edit the available drawing tools in `src/components/SketchToolbar.tsx`.

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/tldraw/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).
