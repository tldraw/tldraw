<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png" />
	</picture>
</div>

# @tldraw/tldraw

This is the alpha version of [tldraw](https://beta.tldraw.com). It is very much a work in progress.

## Installation

Install the `@tldraw/tldraw` package using `@alpha` for the latest alpha release.

```bash
yarn add @tldraw/tldraw@alpha
# or
npm install @tldraw/tldraw@alpha
# or
pnpm i @tldraw/tldraw@alpha
```

Then start the local development server.

```bash
yarn dev
# or
npm run dev
# or
pnpm dev
```

## Usage

An extremely minimal usage (without our UI) might look like this:

```tsx
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/styles-editor.css'
import '@tldraw/tldraw/styles-ui.css'

export default function () {
	return <Tldraw />
}
```

See the [examples repo](https://github.com/tldraw/tldraw-examples) for more examples.

## License

The source code in this repository (as well as our 2.0+ distributions and releases) are currently licensed under Apache-2.0. These licenses are subject to change in our upcoming 2.0 release. If you are planning to use tldraw in a commercial product, please reach out at [hello@tldraw.com](mailto://hello@tldraw.com).
