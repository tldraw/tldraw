<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://github.com/tldraw/tldraw/raw/main/assets/github-hero-light.png" />
	</picture>
</div>

# @tldraw/tldraw

This package contains the source code for the tldraw library. Learn more at our docs site: [tldraw.dev](https://tldraw.dev).

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
	return <Tldraw/>
}
```

See the [examples folder](https://github.com/tldraw/tldraw/tree/main/apps/examples) for more examples.

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new).

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## License

The tldraw source code and its distributions are provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/master/LICENSE.md). This license does not permit commercial use.

If you wish to use this project in commercial product, you need to purchase a commercial license. Please contact us at [hello@tldraw.com](mailto:hello@tldraw.com) for more inforion about obtaining a commercial license.

## Trademarks

Copyright (c) 2023-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter at [@tldraw](https://twitter.com/tldraw) or email [hello@tldraw.com](mailto://hello@tldraw.com). You can also [join our discord](https://discord.gg/rhsyWMUJxd) for quick help and support.
