<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png" />
	</picture>
</div>

# tldraw

[![npm](https://img.shields.io/npm/v/tldraw)](https://www.npmjs.com/package/tldraw)
[![npm downloads](https://img.shields.io/npm/dm/tldraw)](https://www.npmjs.com/package/tldraw)
[![Discord](https://img.shields.io/discord/1082578835393245284?label=discord)](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tldraw/tldraw)

An infinite canvas SDK for React. Build whiteboards, design tools, diagramming apps, collaborative spaces, and more. It's also the engine behind [tldraw.com](https://tldraw.com).

[Docs](https://tldraw.dev) · [Examples](https://tldraw.dev/examples) · [Discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink) · [Pricing](https://tldraw.dev/pricing)

## Features

- **Infinite canvas** with pan, zoom, and minimap
- **Rich shape library** — draw, text, geo, arrows, sticky notes, images, video, and more
- **Real-time multiplayer** via [`@tldraw/sync`](https://tldraw.dev/docs/sync)
- **Extensible shapes and tools** — create your own with `ShapeUtil` and `StateNode`
- **Customizable UI** — override any component
- **Persistence** with built-in IndexedDB support and undo/redo
- **SVG and image export**
- **Full TypeScript** support

## Quick start

```bash
npm i tldraw
```

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

Or scaffold a full project with a starter kit:

```bash
npx create-tldraw@latest
```

Available starter kits: **basic**, **multiplayer**, **workflow**, **chat**, **agent**, **branching-chat**, and more. See [tldraw.dev/quick-start](https://tldraw.dev/quick-start) for details.

## Packages

| Package                                                              | Description                                  |
| -------------------------------------------------------------------- | -------------------------------------------- |
| [`tldraw`](https://www.npmjs.com/package/tldraw)                     | Complete SDK with shapes, tools, and UI      |
| [`@tldraw/editor`](https://www.npmjs.com/package/@tldraw/editor)     | Core canvas engine (no UI or default shapes) |
| [`@tldraw/sync`](https://www.npmjs.com/package/@tldraw/sync)         | Real-time multiplayer collaboration          |
| [`@tldraw/store`](https://www.npmjs.com/package/@tldraw/store)       | Reactive client-side data store              |
| [`@tldraw/state`](https://www.npmjs.com/package/@tldraw/state)       | Signals-based reactivity library             |
| [`@tldraw/tlschema`](https://www.npmjs.com/package/@tldraw/tlschema) | Type definitions and validation              |

## Local development

Clone the repo, then:

```bash
npm i -g corepack  # enable corepack for the correct yarn version
yarn                # install dependencies
yarn dev            # start dev server at localhost:5420
```

See our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md) for more details.

## Community

- [Discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink) — questions, feedback, and discussion
- [Twitter/X](https://twitter.com/tldraw) — news and updates
- [tldraw.dev](https://tldraw.dev) — docs and release notes

Found a bug? [Submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md). You can use the SDK freely in development. Production use requires a [license key](https://tldraw.dev/pricing). Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2025-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. See our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for details.

## Contributors

<a href="https://github.com/tldraw/tldraw/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=tldraw/tldraw&max=400&columns=20" width="100%"/>
</a>

## Star history

<a href="https://star-history.com/#tldraw/tldraw">
	<picture>
	  <source
	    media="(prefers-color-scheme: dark)"
	    srcset="https://api.star-history.com/svg?repos=tldraw/tldraw&type=Date&theme=dark"
	  />
	  <source
	    media="(prefers-color-scheme: light)"
	    srcset="https://api.star-history.com/svg?repos=tldraw/tldraw&type=Date"
	  />
	  <img src="https://api.star-history.com/svg?repos=tldraw/tldraw&type=Date" alt="Star History Chart" width="100%" />
	</picture>
</a>
