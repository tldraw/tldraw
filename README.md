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

## License

The source code for various apps and packages in this repository (as well as our 2.0+ distributions and releases) are currently licensed under Apache-2.0. These licenses are subject to change in our upcoming 2.0 release. If you are planning to use tldraw in a commercial product, please reach out at [hello@tldraw.com](mailto://hello@tldraw.com).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Contact

Find us on Twitter at [@tldraw](https://twitter.com/tldraw) or email [hello@tldraw.com](mailto://hello@tldraw.com). You can also [join our discord](https://discord.gg/rhsyWMUJxd) for quick help and support.
