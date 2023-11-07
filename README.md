<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark-draw.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light-draw.png" />
	</picture>
</div>

# tldraw

Welcome to the public monorepo for [tldraw](https://tldraw.com).

## What is tldraw?

tldraw is a collaborative digital whiteboard available at [tldraw.com](https://tldraw.com). Its editor, user interface, and other underlying libraries are open source and available in this repository. They are also distributed on npm. You can use tldraw to create a drop-in whiteboard for your product or as the foundation on which to build your own infinite canvas applications.

Learn more at [tldraw.dev](https://tldraw.dev).

> **Note** This repo contains source code for the **current version** of tldraw. You can find the source for the original version [here](https://github.com/tldraw/tldraw-v1).

## Installation & Usage

To learn more about using tldraw in your React application, follow our guide [here](https://tldraw.dev/installation) or see the [examples sandbox](https://stackblitz.com/github/tldraw/tldraw/tree/examples?file=src%2F1-basic%2FBasicExample.tsx).

```tsx
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function () {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

## Local development

To run the local development server, first clone this repo.

Install dependencies:

```bash
yarn
```

Start the local development server:

```bash
yarn dev
```

Open the example project at `localhost:5420`.

### Examples

Our development server contains several examples that demonstrates different ways that you can customize tldraw or use its APIs. Each example is found in the [**apps/examples**](https://github.com/tldraw/tldraw/tree/main/apps/examples) folder.

- eg: `localhost:5420` for the basic example.
- eg: `localhost:5420/api` for the API example.

To learn more about using tldraw, [visit our docs](https://tldraw.dev).

## About this repository

### Top-level layout

This repository's contents is divided across four primary sections:

- `/apps` contains the source for our applications
- `/packages` contains the source for our public packages
- `/scripts` contains scripts used for building and publishing
- `/assets` contains icons and translations relied on by the app
- `/docs` contains the content for our docs site at [tldraw.dev](https://tldraw.dev)

### Applications

- `examples`: our local development / examples project
- `vscode`: our [Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=tldraw-org.tldraw-vscode)

### Packages

- `assets`: a library for working with tldraw's fonts and translations
- `editor`: the tldraw editor
- `state`: a signals library, also known as signia
- `store`: an in-memory reactive database
- `tldraw`: the main tldraw package containing both the editor and the UI
- `tlschema`: shape definitions and migrations
- `utils`: low-level data utilities shared by other libraries
- `validate`: a validation library used for run-time validation

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new).

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

At the moment the tldraw package is in alpha. We also ship a canary version which is always up to date with the main branch of this repo.

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
