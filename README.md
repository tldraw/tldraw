<div alt style="text-align: center; transform: scale(.25);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png" />
	</picture>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/tldraw"><img src="https://img.shields.io/npm/v/tldraw" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/tldraw"><img src="https://img.shields.io/npm/dm/tldraw" alt="npm downloads" /></a>
  <a href="https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink"><img src="https://img.shields.io/badge/discord-join-5865F2?logo=discord&logoColor=white" alt="Discord" /></a>
  <a href="https://deepwiki.com/tldraw/tldraw"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

<h3 align="center">
  Welcome to the public monorepo for tldraw.
</h3>

<h4 align="center"> 
  tldraw is a library for creating infinite canvas applications in React. It powers the whiteboard at <a href="https://tldraw.com">tldraw.com</a>.
</h4>

<p align="center">
  <a href="https://tldraw.dev/quick-start">Docs</a> · <a href="https://tldraw.dev/examples">Examples</a> · <a href="https://tldraw.dev/blog">Blog</a>
</p>

## Feature highlights

tldraw's runtime APIs allow for extensive customization. Create custom shapes, tools, bindings and UI components for a custom whiteboard, or use the editor's primitives to build entirely new canvas experiences.

- **Multiplayer** — real-time collaboration powered by Cloudflare Durable Objects via [`@tldraw/sync`](https://tldraw.dev/docs/sync)
- **Markup tools** — [perfect freehand](https://tldraw.dev/sdk-features/draw-shape) and perfect arrows, [snapping](https://tldraw.dev/sdk-features/snapping), edge scrolling, [SVG export](https://tldraw.dev/sdk-features/image-export), image and video support
- **Data store** — signals-based reactive store with persistence, undo/redo, and change tracking via [`@tldraw/store`](https://www.npmjs.com/package/@tldraw/store)
- **Rich text** — [text editing](https://tldraw.dev/sdk-features/rich-text) with formatting, lists, and links inside shapes
- **Embeds** — YouTube, Figma, Google Maps, CodeSandbox, Spotify, GitHub Gist, [and more](https://tldraw.dev/sdk-features/embed-shape)
- **Extensible** — custom [shapes](https://tldraw.dev/docs/shapes), [tools](https://tldraw.dev/docs/tools), [bindings](https://tldraw.dev/sdk-features/bindings), [UI components](https://tldraw.dev/sdk-features/ui-components), side effects, and event hooks
- **AI integrations** — canvas primitives for [building with LLMs](https://tldraw.dev/docs/ai)

## Quick start

Install the tldraw package:

```bash
npm i tldraw
```

Then, use the `<Tldraw />` component in your React app:

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

Get up and running quickly with tldraw's starter kits. Starter kits give you a tested foundation for complex canvas interactions. Each kit is MIT-licensed and built for customization.

- **Workflow** — drag-and-drop node builder for automation pipelines, visual programming, and no-code platforms
- **Agent** — AI agents that read, interpret, and modify canvas content
- **Chat** — canvas-powered AI chat where users sketch, annotate, and mark up images alongside conversations
- **Branching chat** — AI chat with visual branching, letting users explore and compare different conversation paths
- **Multiplayer** — self-hosted real-time collaboration powered by `@tldraw/sync` and Cloudflare Durable Objects, the same stack behind [tldraw.com](https://tldraw.com)
- **Shader** — WebGL shaders that respond to canvas interactions

Start building with:

```bash
npx create-tldraw@latest
```

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

The development server runs the examples app at `localhost:5420`. Clone the repo, then enable [corepack](https://nodejs.org/api/corepack.html) for the correct yarn version:

```bash
npm i -g corepack
```

Install dependencies and start the dev server:

```bash
yarn
yarn dev
```

## Contributing

We're not currently accepting external pull requests; [here's why](https://tldraw.dev/blog/stay-away-from-my-trash). Bug reports, feature requests, and discussion are always welcome. See our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md) for more.

## Community

- [Discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink) — questions, feedback, and discussion
- [Twitter/X](https://twitter.com/tldraw) — news and updates
- [tldraw.dev](https://tldraw.dev) — docs and release notes
- [Submit an issue](https://github.com/tldraw/tldraw/issues/new) — bug reports and feature requests

## License

The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the SDK freely in development. Production use requires a [license key](https://tldraw.dev/pricing).

Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw.

Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

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
