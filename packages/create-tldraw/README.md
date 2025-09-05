# npm create tldraw

A CLI tool for quickly scaffolding a new tldraw project. Inspired by `npm create vite`.

## Usage:
```
$ npm create tldraw -- --help
Usage: create-tldraw [OPTION]... [DIRECTORY]

Create a new project using tldraw.
With no arguments, start the CLI in interactive mode.

Options:
  -h, --help                 display this help message
  -t, --template NAME        use a specific template
  -o, --overwrite            overwrite the target directory if it exists
```

## Development

Run in development mode with `yarn dev` from this folder.
You can also run `alias create-tldraw=~/<path to this repo>/packages/create-tldraw/scripts/dev.sh`, and then use `create-tldraw` to run the development version of this script.

## Adding more templates

Templates are automatically pulled into this tool by `/internal/scripts/refresh-create-templates.ts`.
This will add a template entry for any workspace in the repo which has a `package.json` with a `tldraw_template` key that looks like this:

```jsonc
{
  "tldraw_template": {
    // indicates that this is a template app and should be published:
    "publish": {
      // the github repo to publish this template to
      "repo": "tldraw/vite-template",
      // the name of this template, as it appears in the CLI tool
      "name": "Vite + tldraw",
      // the description of this template as it appears in the CLI tool
      "description": "The easiest way to get started with tldraw. Built with Vite, React, and TypeScript.",
      // "framework" or "app". Controls which section of the CLI this is listed in
      "category": "framework",
      // where in its category should this template appear? lower numbers appear first
      "order": 1
    }
  }
}
```
