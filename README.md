<div alt style="text-align: center; transform: scale(.25);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png" />
	</picture>
</div>

# tldraw

<h3 align="center">
  An infinite canvas SDK for React. The engine behind <a href="https://tldraw.com">tldraw.com</a>.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/tldraw"><img src="https://img.shields.io/npm/v/tldraw" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/tldraw"><img src="https://img.shields.io/npm/dm/tldraw" alt="npm downloads" /></a>
  <a href="https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink"><img src="https://img.shields.io/discord/1082578835393245284?label=discord" alt="Discord" /></a>
  <a href="https://deepwiki.com/tldraw/tldraw"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

<p align="center">
  <a href="https://tldraw.dev">Docs</a> · <a href="https://tldraw.dev/examples">Examples</a> · <a href="https://tldraw.dev/pricing">Pricing</a>
</p>

## Features

- **Markup tools** — perfect freehand drawing and arrows, snapping, edge scrolling, SVG export, image and video support
- **Multiplayer** — real-time sync via [`@tldraw/sync`](https://tldraw.dev/docs/sync) and Cloudflare Durable Objects
- **Data store** — signals-based reactive store with persistence, undo/redo, and change tracking ([`@tldraw/store`](https://www.npmjs.com/package/@tldraw/store))
- **Rich text** — text editing with formatting, lists, and links inside shapes
- **Embeds** — YouTube, Figma, Google Maps, CodeSandbox, Spotify, GitHub Gist, and more
- **Extensible** — custom shapes, tools, bindings, UI components, side effects, and event hooks are editable
- **AI** — starter kits and canvas primitives for building with LLMs

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

## Starter kits

Scaffold a full project with a starter kit:

```bash
npx create-tldraw@latest
```

**Workflow** — Drag-and-drop node builder for automation pipelines, visual programming, and no-code platforms.

**Chat** — Canvas-powered AI chat where users sketch, annotate, and mark up images alongside conversations.

**Agent** — AI agents that read, interpret, and modify canvas content.

**Branching chat** — AI chat with visual branching, letting users explore and compare different conversation paths.

**Multiplayer** — Self-hosted real-time collaboration powered by `@tldraw/sync` and Cloudflare Durable Objects, the same stack behind [tldraw.com](https://tldraw.com).

**Shader** — WebGL shaders that respond to canvas interactions.

Starter kits give you a tested foundation for complex canvas interactions. Each kit is production-ready, built for customization, and MIT licensed - you can add your own shapes, tools, and behaviors on top. See [tldraw.dev/quick-start](https://tldraw.dev/quick-start) for details.

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

## Contributing

We're not currently accepting external pull requests — [here's why](https://tldraw.dev/blog/stay-away-from-my-trash). Bug reports, feature requests, and discussion are always welcome. See our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md) for more.

## Community

- 💬 [Discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink) — questions, feedback, and discussion
- 🐦 [Twitter/X](https://twitter.com/tldraw) — news and updates
- 📚 [tldraw.dev](https://tldraw.dev) — docs and release notes
- 🐛 [Submit an issue](https://github.com/tldraw/tldraw/issues/new) — bug reports and feature requests
- [Submit an issue](https://github.com/tldraw/tldraw/issues/new) — bug reports and feature requests

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
