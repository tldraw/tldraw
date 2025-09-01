# tldraw agent chat

This repo is a starter for building an agentic chat with tldraw.

## How to run the starter

1. Create a `.dev.vars` file in the root directory.
2. Add API keys for any providers that you want to use, e.g. `OPENAI_API_KEY=your-key`, `ANTHROPIC_API_KEY=your-key`, `GOOGLE_API_KEY=your-key`.
3. Install dependencies with `pnpm i`
4. Run `pnpm run dev`
5. Open `http://localhost:5173/` in your browser.

TODO: Add a note on the main entry point (`useTldrawAgent`).

## How to change what the agent can do

TODO

ie: Using agent action utils

eg: Editing the canvas

## How to change how actions appear in chat history

TODO

- Using agent action util methods
  - Grouping actions
- Using CSS

## How to get the agent to schedule further work

TODO

## How to get the agent to use an external API

TODO

## How to get the agent to use MCP

TODO

## How to change what the model can see

TODO

ie: Using prompt part utils

## How to change the system prompt

TODO

ie: Edit the system prompt part util

## How to support custom shapes

TODO

ie: It should work out-of-the-box, but you can still add extra detail if you want.

- Add a new agent action.
- Add a custom shape to the schema.

## License

This project is part of the tldraw SDK. It is provided under the [tldraw SDK license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the tldraw SDK in commercial or non-commercial projects so long as you preserve the "Made with tldraw" watermark on the canvas. To remove the watermark, you can purchase a [business license](https://tldraw.dev#pricing). Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find the @tldraw/ai package on npm [here](https://www.npmjs.com/package/@tldraw/ai?activeTab=versions). You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at [mailto:hello@tldraw.com](hello@tldraw.com).
