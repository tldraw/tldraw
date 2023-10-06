<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png" />
	</picture>
</div>

# @tldraw/tldraw

This is the pre-release version of [tldraw](https://github.com/tldraw/tldraw).

See the pre-release docs at [canary.tldraw.dev](https://canary.tldraw.com).

## Installation

Install the `@tldraw/tldraw` package using `@canary` for the latest canary release. (Or `@alpha` for the latest alpha release.)

```bash
yarn add @tldraw/tldraw@canary
# or
npm install @tldraw/tldraw@canary
# or
pnpm i @tldraw/tldraw@canary
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
import '@tldraw/tldraw/tldraw.css'

export default function () {
	return <Tldraw />
}
```

See the [examples folder](https://github.com/tldraw/tldraw/tree/main/apps/examples) for more examples.

## License

The source code in this repository (as well as our 2.0+ distributions and releases) are currently licensed under Apache-2.0. These licenses are subject to change in our upcoming 2.0 release. If you are planning to use tldraw in a commercial product, please reach out at [hello@tldraw.com](mailto://hello@tldraw.com).
