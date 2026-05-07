<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This repo contains a starter-kit for making a "make real" application using [tldraw](https://github.com/tldraw/tldraw). Draw a wireframe, click "Make real", and a vision-capable AI model will turn your sketch into a working HTML prototype.

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:3000/` in your browser to see the app.

## Environment setup

Create a `.env.local` file in the root directory and add an API key for at least one of the supported providers:

```
# OpenAI (default)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Generative AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Optional: choose the default provider (openai | anthropic | google)
NEXT_PUBLIC_MAKE_REAL_PROVIDER=openai
```

Get keys from:

- [OpenAI](https://platform.openai.com/api-keys)
- [Anthropic](https://console.anthropic.com/settings/keys)
- [Google AI Studio](https://aistudio.google.com/apikey)

The make-real API route uses the [Vercel AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers), so you can swap in any other provider with very little code change.

## How it works

1. Draw a wireframe on the canvas.
2. Select your shapes and click "Make real".
3. The app captures a screenshot of your selection and any associated text.
4. The screenshot, text, and any previous designs are sent to a vision-capable AI model.
5. The model replies with a single self-contained HTML file, which is rendered inside a custom `PreviewShape` next to your selection.
6. You can annotate the preview, select it together with new shapes, and click "Make real" again to iterate.

## File structure

- **`src/app/page.tsx`:** The main entry point that mounts the tldraw editor with the make-real button and `PreviewShape`.
- **`src/components/PreviewShape.tsx`:** Custom shape that renders the generated HTML inside a sandboxed iframe.
- **`src/components/MakeRealButton.tsx`:** The button that triggers the make-real flow from the editor.
- **`src/lib/makeReal.ts`:** Core flow that captures the selection, calls the API, and updates the preview shape.
- **`src/lib/getSelectionAsText.ts`:** Helper that collects text from the selection to send as additional context.
- **`src/lib/prompt.ts`:** The system prompt and user prompts that shape the model's response.
- **`src/app/api/make-real/route.ts`:** Server-side API route that proxies requests to the configured AI provider.

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/make-real-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

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
