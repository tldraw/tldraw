> **Note**<br>
> This repo is for the **new version** of tldraw, which is hosted at [tldraw.com](https://tldraw.com).<br>
> The code for the old version (hosted at [old.tldraw.com](https://old.tldraw.com)) can be found in the [v1 repo](https://github.com/tldraw/tldraw-v1).

<br>

<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/lite/assets/github-hero-dark-draw.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/lite/assets/github-hero-light-draw.png" />
	</picture>
</div>

# tldraw

Welcome to the new [tldraw](https://tldraw.com) monorepo!

It contains the public tldraw packages, and examples of how to use them.<br>
Read below for how to run the examples locally.<br>
Or check out our work-in-progress docs at [docs.tldraw.com](https://docs.tldraw.dev).<br>

🙌 Questions? Join our [Discord](https://discord.gg/rhsyWMUJxd) or start a [discussion](https://github.com/tldraw/tldraw/discussions/new).

## Getting started

To run the examples locally, first clone this repo.

Install dependencies:

```bash
yarn
```

Then start the local development server:

```bash
yarn dev
```

Each individual example is found in the [**apps/examples/src**](https://github.com/tldraw/tldraw/tree/main/apps/examples/src) folder. And you can try them out by visiting different routes.

- eg: `localhost:5420` for the basic example.
- eg: `localhost:5420/api` for the API example.

For more info on how to build something with tldraw... check out our work-in-progress docs at [docs.tldraw.com](https://docs.tldraw.dev).

## License

The various tldraw libraries are licensed mostly under Apache 2.0.<br>
The examples are licensed under MIT.
