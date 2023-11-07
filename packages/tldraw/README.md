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
	return <Tldraw />
}
```

See the [examples folder](https://github.com/tldraw/tldraw/tree/main/apps/examples) for more examples.

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new).

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Open source license

tldraw is open source under the GNU Affero General Public License Version 3 (AGPLv3) or any later version. You can find it [here](https://github.com/tldraw/tldraw/blob/master/LICENSE.md). All packages are distributed under the same license.

The GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software. The AGPL-3.0 license allows users to use and modify the software as long as they keep it open source and provide any modifications or derivative works under the same license.

## Commercial license

If you wish to use this project in closed-source software or otherwise do not want to comply with the AGPL-3.0, you need to purchase a commercial license. Please contact us at [hello@tldraw.com](mailto:hello@tldraw.com) for more information about obtaining a commercial license.

The dual licensing model supports the development of the project by providing an open source option for those who are contributing back to the community, while also supporting commercial usage for entities that are not able to do so.

## Trademarks

Copyright (c) 2023-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRANDEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter at [@tldraw](https://twitter.com/tldraw) or email [hello@tldraw.com](mailto://hello@tldraw.com). You can also [join our discord](https://discord.gg/rhsyWMUJxd) for quick help and support.
