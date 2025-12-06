# npm create tldraw

A CLI tool for quickly scaffolding a new tldraw project. Inspired by `npm create vite`.

## Usage:

```
$ npm create tldraw -- --help
Usage: create-tldraw [OPTION]... [DIRECTORY]

Create a new tldraw project.
With no arguments, you'll be guided through an interactive setup.

Options:
   -h, --help           Display this help message.
   -t, --template NAME  Use a specific template.
   -o, --overwrite      Overwrite the target directory if it exists.

Available starter kits:
 • basic                A minimal tldraw template with Vite, React, and TypeScript.
 • agent                An AI-powered agent.
 • branching-chat       A branching chat interface.
 • chat                 A chat UI with sketches and images as context for AI.
 • multiplayer          Real-time multiplayer for tldraw, built with Cloudflare Durable Objects.
 • workflow             Visual node-based builder for workflows.
```

## Development

Run in development mode with `yarn dev` from this folder.
You can also run `alias create-tldraw=~/<path to this repo>/packages/create-tldraw/scripts/dev.sh`, and then use `create-tldraw` to run the development version of this script.

## Adding more templates

Templates are automatically pulled into this tool by `/internal/scripts/refresh-create-templates.ts`.
This will add a template entry for any workspace in the repo which has a `package.json` with a `tldraw_template` key that looks like this:

```jsonc
{
	// indicates that this is a template app and should be published:
	"tldraw_template": {
		// the github repo to publish this template to
		"repo": "tldraw/vite-template",
		// if `cli` is present, we'll include this template in `npm create tldraw`
		"cli": {
			// the name of this template, as it appears in the CLI tool
			"name": "Vite + tldraw",
			// the description of this template as it appears in the CLI tool
			"description": "The easiest way to get started with tldraw. Built with Vite, React, and TypeScript.",
			// (optional) a shorter description of the template, shown in `--help`
			"shortDescription": "The easiest way to get started with tldraw.",
			// (optional) where in its category should this template appear? lower numbers appear first
			"order": 1,
		},
	},
}
```

## License

This project is part of the tldraw SDK. It is provided under the [tldraw SDK license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the tldraw SDK in commercial or non-commercial projects so long as you preserve the "Made with tldraw" watermark on the canvas. To remove the watermark, you can purchase a [business license](https://tldraw.dev#pricing). Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2025-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at [hello@tldraw.com](mailto:hello@tldraw.com).
