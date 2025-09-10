# tldraw ai starter

This repo is a starter for projects that use the [tldraw ai module](https://github.com/tldraw/tldraw/tree/main/packages/ai).

To use:

1. Create a `.dev.vars` file in the root directory.
2. Add your OpenAI key to that file as an environment variable, i.e. `OPENAI_API_KEY=sk-your-key`.
3. Install dependencies with `pnpm i`
4. Run `pnpm run dev`
5. Open `http://localhost:5173/` in your browser.

To hack:

- Edit the example system prompt at `worker/openai/system-prompt.ts`.
- Create new transforms and use them in `useTldrawAiExample`.
- Maybe replace the OpenAI service with your own.

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/ai-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find the @tldraw/ai package on npm [here](https://www.npmjs.com/package/@tldraw/ai?activeTab=versions). You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at [hello@tldraw.com](mailto:hello@tldraw.com).
