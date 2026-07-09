<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This starter kit is a realtime sketch-to-image generator built on [tldraw](https://github.com/tldraw/tldraw). Draw on the canvas with the draw and shape tools and watch a generated image update live beside it, powered by [fal.ai](https://fal.ai)'s Latent Consistency Models. You can then turn any generated image into a short video clip.

## Environment setup

This template uses fal.ai for generation and Anthropic's Claude to auto-write the image prompt from your sketch. Create a `.dev.vars` file in this directory and add both keys:

```
FAL_KEY=your_fal_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

Get a fal.ai key from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) and an Anthropic key from [console.anthropic.com](https://console.anthropic.com/settings/keys). Without the fal key, generation requests fail with a clear error in the panel; without the Anthropic key, the auto-prompt fails but you can still type a prompt yourself.

Neither key reaches the browser. The worker proxies every request and injects the keys server-side. For deployment, set them as secrets instead:

```
wrangler secret put FAL_KEY
wrangler secret put ANTHROPIC_API_KEY
```

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open the printed local URL in your browser, then start drawing.

## How it works

There are four main pieces:

1. **The sketch capture** (`src/realtime/captureSketch.ts`): on each canvas edit, the shapes are rasterized to a 512×512 PNG and letterboxed onto a white square — the input format the LCM model expects.
2. **The auto-prompt** (`src/realtime/describeSketch.ts` → `worker/routes/describe.ts`): once your drawing settles, the captured sketch is sent to Claude, which writes a short image-generation prompt describing what it should become. You never have to type one. Type in the prompt box to take over; hit **Use auto** to hand it back. Because a vision call costs time and money, this runs only on the settled frame (after a ~600ms pause), not on every stroke.
3. **The generation loop** (`src/realtime/falConnection.ts`): each captured frame is sent to fal's `fal-ai/lcm-sd15-i2i` model through the proxy, using the auto-written (or typed) prompt. LCM returns in ~150–350ms. Each new frame supersedes any in-flight request, so a slow response never overwrites a newer one. The `useRealtimeGeneration` hook debounces edits and wires it all together — on a settled sketch it describes first, then generates.
4. **The worker proxies** (`worker/routes/falProxy.ts`, `worker/routes/describe.ts`): a small Cloudflare Worker that forwards fal requests with your `FAL_KEY` attached and Claude requests with your `ANTHROPIC_API_KEY` attached, so neither key reaches the browser.

### Controls

The panel on the right steers generation:

- **Prompt** — what the sketch should become. Written for you from the sketch by default (shown as `✦ auto`); type to steer it yourself.
- **Strength** — how far the model may deviate from your drawing (lower stays closer to the sketch).
- **Steps** — LCM needs very few; 4 is a good default.
- **Seed** — fix it for reproducible results.

### Animate → video

The **Animate → video** button sends the current generated image to fal's Seedance image-to-video model (`worker/routes/animate.ts`) and shows the resulting clip. Unlike the sketch loop, this is a queued, multi-second generation — a deliberate action rather than something that runs live.

## Customizing

- Swap the realtime model in `src/constants.ts` (`REALTIME_MODEL`). fal offers several LCM variants tuned for different input styles.
- Adjust the capture resolution and debounce in `src/constants.ts`. The debounce (`DEBOUNCE_MS`) is also how long the sketch must settle before the prompt+image are (re)generated.
- Change the video model in `worker/routes/animate.ts`.
- Tune the auto-prompt model or its instructions in `worker/routes/describe.ts` (`DESCRIBE_MODEL`, `SYSTEM_PROMPT`).
- Edit the available drawing tools in `src/components/SketchToolbar.tsx`.

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/tldraw/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).
