<p align="center">
  <a href="https://parceljs.org/" target="_blank">
    <img alt="Parcel" src="https://user-images.githubusercontent.com/19409/31321658-f6aed0f2-ac3d-11e7-8100-1587e676e0ec.png" width="749">
  </a>
</p>

[![Backers on Open Collective](https://opencollective.com/parcel/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/parcel/sponsors/badge.svg)](#sponsors)
[![Build Status](https://dev.azure.com/devongovett/devongovett/_apis/build/status/parcel-bundler.parcel?branchName=v2)](https://dev.azure.com/devongovett/devongovett/_build/latest?definitionId=1)
[![npm package](https://img.shields.io/npm/v/parcel.svg)](https://www.npmjs.com/package/parcel)
[![npm package](https://img.shields.io/npm/dm/parcel.svg)](https://www.npmjs.com/package/parcel)
[![Twitter Follow](https://img.shields.io/twitter/follow/parceljs.svg?style=social)](https://twitter.com/parceljs)

## Features

- 🚀 **Blazing fast** bundle times - multicore compilation, and a filesystem cache for fast rebuilds even after a restart.
- 📦 Out of the box support for JS, CSS, HTML, file assets, and more - **no plugins to install**.
- 🐠 **Automatically transforms modules** using Babel, PostCSS, and PostHTML when needed - even `node_modules`.
- ✂️ Zero configuration **code splitting** using dynamic `import()` statements.
- 🔥 Built in support for **hot module replacement**
- 🚨 Friendly error logging experience - syntax highlighted code frames help pinpoint the problem.


---

**Below is the design document that was created before work on the implementation of Parcel 2 started and some sections are outdated. The actual (somewhat complete) documentation for Parcel 2 is available here: https://v2.parceljs.org/.**


----

## Getting Started

Before we get started, you'll need to install Node and Yarn (or npm) and create
a `package.json` for your project if you haven't already.

```sh
yarn init
```

Then with Yarn you can install `parcel` into your app:

```sh
yarn add --dev parcel@next
```

From there you just need to point Parcel at some of your entry files. Like if
you're building a website, an `index.html` file:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My First Parcel App</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

Now if you just run:

```sh
yarn parcel index.html
```

You should get a URL that looks something like: `http://localhost:1234/`.

Next you can start adding dependencies by specifying them in your code (however
your language specifies other assets). So for HTML we could create a
`styles.css` file next to our `index.html` file and include it with a `<link>`
tag.

```css
h1 {
  color: hotpink;
  font-family: cursive;
}
```

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My First Parcel App</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

If we want parcel to update our changes in the browser without refreshing the page,
we need to add at least a dummy javascript file e.g. `app.js` next to our `index.html`.
This file allows parcel to inject all the necessary code to show your changes.
This file will later contain your javascript application.

```javascript
console.log("Hello World");
```

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My First Parcel App</title>
    <link rel="stylesheet" href="./styles.css" />
    <script src="./app.js"></script>
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

## Documentation

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Introduction](#introduction)
- [Parcel CLI](#parcel-cli)
  - [CLI Args & Flags](#cli-args--flags)
    - [`parcel serve`](#parcel-serve)
    - [`parcel watch`](#parcel-watch)
    - [`parcel build`](#parcel-build)
    - [`[...entries]`](#entries)
    - [`--target [name]`](#--target-name)
    - [`--open, -o [browser]`](#--open--o-browser)
    - [`--host <host>`](#--host-host)
    - [`--port <port>, -p`](#--port-port--p)
    - [`--https`](#--https)
      - [`--cert <path>`](#--cert-path)
      - [`--key <path>`](#--key-path)
    - [`--dist-dir <dir>`](#--dist-dir-dir)
    - [`--cache-dir <dir>`, `--no-cache`](#--cache-dir-dir---no-cache)
    - [`--config <path>`](#--config-path)
    - [`--hot`, `--no-hot`](#--hot---no-hot)
      - [`--hot-host <hostname>`](#--hot-host-hostname)
      - [`--hot-port <port>`](#--hot-port-port)
    - [`--[no-]source-maps`](#--no-source-maps)
    - [`--autoinstall [npm/yarn], --no-autoinstall`](#--autoinstall-npmyarn---no-autoinstall)
    - [`--log-level <level>`](#--log-level-level)
    - [`--version, -v, -V`](#--version--v--v)
    - [`--help, -h`](#--help--h)
- [Parcel Config](#parcel-config)
  - [Configuring external tools](#configuring-external-tools)
  - [Configuring Parcel](#configuring-parcel)
  - [`package.json`](#packagejson)
    - [`package.json#name`](#packagejsonname)
    - [`package.json#version`](#packagejsonversion)
    - [`package.json#main`](#packagejsonmain)
    - [`package.json#module`](#packagejsonmodule)
    - [`package.json#browser`](#packagejsonbrowser)
    - [`package.json#source`](#packagejsonsource)
    - [`package.json#browserslist`](#packagejsonbrowserslist)
    - [`package.json#engines`](#packagejsonengines)
    - [`package.json#targets`](#packagejsontargets)
    - [`package.json#alias`](#packagejsonalias)
  - [`.parcelrc`](#parcelrc)
    - [Glob maps in `.parcelrc`](#glob-maps-in-parcelrc)
    - [`.parcelrc#extends`](#parcelrcextends)
    - [`.parcelrc#resolvers`](#parcelrcresolvers)
    - [`.parcelrc#transformers`](#parcelrctransformers)
    - [`.parcelrc#bundler`](#parcelrcbundler)
    - [`.parcelrc#namers`](#parcelrcnamers)
    - [`.parcelrc#runtimes`](#parcelrcruntimes)
    - [`.parcelrc#packagers`](#parcelrcpackagers)
    - [`.parcelrc#optimizers`](#parcelrcoptimizers)
    - [`.parcelrc#reporters`](#parcelrcreporters)
    - [`.parcelrc#validators`](#parcelrcvalidators)
- [Parcel Architecture](#parcel-architecture)
  - [Phases of Parcel](#phases-of-parcel)
  - [Asset Graph](#asset-graph)
  - [Bundles](#bundles)
  - [Sources](#sources)
  - [Targets](#targets)
    - [Target Configuration](#target-configuration)
  - [Environments](#environments)
  - [Caching](#caching)
- [Asset Resolution](#asset-resolution)
  - [Local Paths](#local-paths)
  - [Package Paths](#package-paths)
  - [URLs](#urls)
  - [Tilde Paths](#tilde-paths)
  - [Aliases](#aliases)
- [Plugins](#plugins)
  - [Resolvers](#resolvers)
  - [Transformers](#transformers)
  - [Bundlers](#bundlers)
  - [Namers](#namers)
  - [Runtimes](#runtimes)
  - [Packagers](#packagers)
  - [Optimizers](#optimizers)
  - [Reporters](#reporters)
  - [Validators](#validators)
- [Creating Plugins](#creating-plugins)
  - [Naming](#naming)
  - [Versioning](#versioning)
  - [Engines](#engines)
- [Plugin APIs](#plugin-apis)
  - [Resolvers](#resolvers-1)
  - [Transformers](#transformers-1)
  - [Bundler](#bundler)
  - [Namers](#namers-1)
  - [Runtimes](#runtimes-1)
  - [Packagers](#packagers-1)
  - [Optimizers](#optimizers-1)
  - [Reporters](#reporters-1)
  - [Validators](#validators-1)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Parcel is a compiler for all your code, regardless of the language or toolchain.

Parcel takes all of your files and dependencies, transforms them, and merges
them together into a smaller set of output files that can be used to run your
code.

Parcel supports many different languages and file types out of the box, from
web technologies like HTML, CSS, and JavaScript, to lower level languages like
Rust, and anything that compiles to WebAssembly (WASM), to assets like images,
fonts, videos, and more.

Parcel makes your code portable. You can build your code for different
environments, for the web for your server, or for an app. You can even build
multiple targets at once and have them live update as you make changes.

Parcel is fast and predictable. It compiles all of your files in isolation in
parallel inside workers, caching all of them as it goes along. Caches are
stable across machines and are only affected by the files and configs within
your project (unless you want to pass specific environment variables).

## Parcel CLI

The Parcel CLI is built into the main `parcel` package. While you can install
it globally and run it, it is much better to install it locally into your
project as a dev dependency.

```sh
yarn add --dev parcel@next
```

You should also add some "scripts" to your `package.json` to run it easier.

```json
{
  "name": "my-project",
  "scripts": {
    "build": "parcel build index.html",
    "start": "parcel serve index.html"
  },
  "devDependencies": {
    "parcel": "latest"
  }
}
```

Now you can run `yarn build` to bundle your project for production and
`yarn start` to dev on your project.

### CLI Args & Flags

Usage:

```sh
$ parcel [command] [...entries] [...flags]
```

#### `parcel serve`

Serve assets on a local server.

#### `parcel watch`

Watch and rebuild code on file changes.

#### `parcel build`

Build code once, in production mode.

#### `[...entries]`

Entry files to start bundling, these will be preserved as entry points in the
output. Defaults to `package.json#source`, falling back to `src/index.*` or
`index.*`. See [#Sources](#sources).

#### `--target [name]`

Specifies a specific target to build. If unspecified, Parcel builds all
targets specified in package.json. See [#Targets](#targets).

#### `--open, -o [browser]`

Open your local server in a browser. You can optionally pass the name of the
browser you want to open, otherwise it will use your default browser.

#### `--host <host>`

Configure the host to serve assets on. The default is to listen on all interfaces.

#### `--port <port>, -p`

Configure the port to serve assets on. Alternatively you can use the `$PORT`
environment variable.

#### `--https`

This will generate a local certificate (which will be untrusted by your
browser, you'll need to approve it) and serve your assets over `https://`

##### `--cert <path>`

Specify the filepath to your SSL certificate when using `--https`.

##### `--key <path>`

Specify the filepath to your SSL key when using `--https`.

#### `--dist-dir <dir>`

Configure the directory where compiled assets are output. Default is `./dist`.

#### `--cache-dir <dir>`, `--no-cache`

Configure the cache directory with `--cache <dir>` or disable it altogether
with `--no-cache`.

#### `--config <path>`
specify which config to use. can be a path or a package name.
`--config ../.myparcelrc` or `--config @parcel/config-default`

#### `--hot`, `--no-hot`

Turn hot reloading on or off.

##### `--hot-host <hostname>`

Configure the hot reloading hostname.

##### `--hot-port <port>`

Configure the hot reloading port.

#### `--[no-]source-maps`

Turn source maps on or off. Source maps are turned on by default.

#### `--autoinstall [npm/yarn], --no-autoinstall`

When enabled, whenever Parcel discovers a dependency that isn't installed it
will attempt to install it with either npm or Yarn (defaults to npm unless a
`yarn.lock` exists).

#### `--log-level <level>`

Set the log level, either either "none", "error", "warn", "info", or "verbose".
The default is "info".

#### `--version, -v, -V`

Return the current version of Parcel.

#### `--help, -h`

Get help with the CLI.

## Parcel Config

Parcel has always and will always work out of the box for many projects with
zero configuration. It should always be extremely simple to get started. But if
you do want more control, we give you the tools to do so.

### Configuring external tools

A huge part of what Parcel does is run other tools over your code. Instead of
pulling all that configuration into Parcel, we make use of their own
configuration systems. So if you're using Babel, you should just use `.babelrc`
files to configure it.

When we do need to introduce config, we create tool specific config files in
order to do so.

### Configuring Parcel

When you do need to configure Parcel, it will be in one of 3 places.

- If you need to configure the CLI, it will be a CLI flag
- If you need to configure your package, it will be in the `package.json`
- If you need to configure something with your files or the Parcel asset
  pipeline, it will be in `.parcelrc`

### `package.json`

[todo]

```json
{
  "name": "foo",
  "main": "dist/main/index.js",
  "module": "dist/module/index.js",
  "browser": "dist/browser/index.js",
  "browserslist": ["> 1%", "not dead"],
  "engines": {
    "node": ">=4.x"
  },
  "source": "src/index.js",
  "targets": {
    "main": {
      "engines": {
        "node": ">=4.x"
      }
    },
    "module": {
      "engines": {
        "node": ">=8.x"
      }
    },
    "browser": {
      "engines": {
        "browsers": ["> 1%", "not dead"]
      }
    }
  },
  "alias": {
    "react": "preact-compat",
    "react-dom": "preact-compat"
  }
}
```

#### `package.json#name`

**(Required)** The name of the package is always required in order to be
considered a valid `package.json`.

```json
{
  "name": "my-package"
}
```

#### `package.json#version`

**(Required)** All packages inside `node_modules` must have a `package.json#version`.

```json
{
  "version": "1.0.0"
}
```

#### `package.json#main`

This is the "main" target's entry point for the package, by default in library mode (doesn't bundle dependencies).

```json
{
  "main": "dist/main/index.js"
}
```

See [Targets](#targets)

#### `package.json#module`

This is the "module" target's entry point for the package, by default in library mode (doesn't bundle dependencies).

```json
{
  "module": "dist/module/index.js"
}
```

See [Targets](#targets)

#### `package.json#browser`

This is the "browser" target's entry point for the package, by default in library mode (doesn't bundle dependencies).

```json
{
  "browser": "dist/browser/index.js"
}
```

See [Targets](#targets)

#### `package.json#source`

Specify the entry points for your source code which gets mapped to your
targets.

```json
{
  "source": "src/index.js",
  "source": ["src/index.js", "src/index.html"]
}
```

See [Sources](#sources)

#### `package.json#browserslist`

As specified by Browserslist, this field is for specifying which transformers
should be applied to browser bundles.

```json
{
  "browserslist": ["> 0.2%", "not dead"]
}
```

See [Environments](#environments)

#### `package.json#engines`

Specify what versions of what engines you want to support.

```json
{
  "engines": {
    "node": ">=4.x",
    "electron": ">=2.x"
  }
}
```

See [Environments](#environments)

#### `package.json#targets`

Configuration for individual targets.

```json
{
  "targets": {
    "main": {
      "engines": {
        "node": ">=4.x",
        "electron": ">=2.x"
      },
    },
    "browser": {
      "engines": {
        "browsers": ["> 1%", "not dead"]
      }
    }
  }
}
```

See [Targets](#targets)

#### `package.json#alias`

Aliases asset names/paths to other assets.

```json
{
  "alias": {
    "react": "preact-compat",
    "react-dom": "preact-compat"
  }
}
```

See [Aliases](#aliases)

### `.parcelrc`

Your `.parcelrc` file will likely contain just a few fields (if you have one at
all), but here's an example of a `.parcelrc` file that contains every field:

```json
{
  "extends": ["@parcel/config-default"],
  "resolvers": ["@parcel/resolver-default"],
  "transformers": {
    "*.vue": ["@parcel/transformer-vue"],
    "*.scss": ["@parcel/transformer-sass"],
    "*.js": ["@parcel/transformer-babel"],
    "*.css": ["@parcel/transformer-postcss"],
    "*.html": ["@parcel/transformer-posthtml"]
  },
  "bundler": "@parcel/bundler-default",
  "namers": ["@parcel/namer-default"],
  "runtimes": ["@parcel/runtime-js", "@parcel/runtime-browser-hmr"],
  "packagers": {
    "*.js": "@parcel/packager-js",
    "*.css": "@parcel/packager-css",
    "*.html": "@parcel/packager-html",
    "*.wasm": "@parcel/packager-wasm",
    "*.raw": "@parcel/packager-raw"
  },
  "optimizers": {
    "*.js": ["@parcel/optimizer-uglify"],
    "*.css": ["@parcel/optimizer-cssnano"],
    "*.html": ["@parcel/optimizer-htmlnano"],
    "*.{png,jpg,jpeg,svg,...}": ["@parcel/optimizer-imagemin"]
  },
  "reporters": ["@parcel/reporter-cli"]
}
```

#### Glob maps in `.parcelrc`

Many config properties like `transformers` or `packagers` use objects as maps of
globs to package names. While objects in JSON are technically unordered, Parcel
does use the order to give globs priority when a file name is being tested
against them.

```json
{
  "transformers": {
    "icons/*.svg": ["highest-priority"],
    "*.svg": ["lowest-priority"]
  }
}
```

Here if we are trying to find a transform for the file `icons/home.svg`, we'll
work our way down the globs until we find a match, which would be
`icons/*.svg`, we never reach `*.svg`.

#### `.parcelrc#extends`

`extends` can either be a string or an array of strings that specify base
configs to extend. That base configuration can be the path to another
`.parcelrc` file or the name of a Parcel config package.

```json
{
  "extends": "@parcel/config-default",
  "extends": "../.parcelrc",
  "extends": ["@parcel/config-default", "@company/parcel-config"]
}
```

When extending a config, Parcel does a shallow merge of the two configs.

#### `.parcelrc#resolvers`

`resolvers` is an array of strings that specifies the name of a Parcel resolver
package.

```json
{
  "resolvers": ["@parcel/resolver-default"]
}
```

See [Resolvers](#resolvers)

#### `.parcelrc#transformers`

`transformers` is an object map of globs to arrays of Parcel transform packages.

```json
{
  "transformers": {
    "*.js": ["@parcel/transformer-babel"]
  }
}
```

See [Transformers](#transformers)

#### `.parcelrc#bundler`

`bundler` is a string that specifies the name of a Parcel bundler package.

```json
{
  "bundler": "@parcel/bundler-default"
}
```

See [Bundlers](#bundlers)

#### `.parcelrc#namers`

`namers` is an array of Parcel namer packages.

```json
{
  "namers": ["@parcel/namer-default"]
}
```

See [Namers](#namers)

#### `.parcelrc#runtimes`

`runtimes` is an array of Parcel runtime packages.

```json
{
  "runtimes": ["@parcel/runtime-js", "@parcel/runtime-browser-hmr"],
}
```

See [Runtimes](#runtimes)

#### `.parcelrc#packagers`

`packagers` is an object map of globs to Parcel packager packages.

```json
{
  "packagers": {
    "*.js": ["@parcel/packager-js"]
  }
}
```

See [Packagers](#packagers)

#### `.parcelrc#optimizers`

`optimizers` is an object map of globs to arrays of Parcel optimizer packages.

```json
{
  "optimizers": {
    "*.js": ["@parcel/optimizer-uglify"]
  }
}
```

See [Optimizers](#optimizers)

#### `.parcelrc#reporters`

`reporters` is an array of Parcel reporter packages.

```json
{
  "reporters": ["@parcel/reporter-detailed"]
}
```

See [Reporters](#reporters).

#### `.parcelrc#validators`

`validators` is an object map of globs to arrays of Parcel validator packages.

```json

  "validators": {
    "*.ts": ["@parcel/validator-typescript"]
  }
}
```

See [Validators](#validators).

## Parcel Architecture

Even if you aren't doing anything that complex, if you are going to use Parcel
a lot it makes sense to take some time and understand how it works.

### Phases of Parcel

At a high level Parcel runs through several phases:

- Resolving
- Transforming
- Bundling
- Packaging
- Optimizing
- (Validating)

The **resolving** and **transforming** phases work together in parallel to
build a graph of all your assets.

This asset graph gets translated into bundles in the **bundling** phase.

Then the **packaging** phase takes the assets in the calculated bundles and
merges them together into files each containing an entire bundle.

Finally, in the **optimizing** phase, Parcel takes these bundles files and runs
them through optimizing transforms.

### Asset Graph

During the resolving and transforming phases, Parcel discovers all the assets
in your app or program. Every asset can have its own dependencies on other
assets which Parcel will pull in.

The data structure that represents all of these assets and their dependencies
on one another is known as "The Asset Graph".

| Asset Name   | Dependencies        |
| ------------ | ------------------- |
| `index.html` | `app.css`, `app.js` |
| `app.css`    | N/A                 |
| `app.js`     | `navbar.js`         |
| `navbar.js`  | etc.                |

### Bundles

Once Parcel has built the entire Asset Graph, it begins turning it into
"bundles". These bundles are groupings of assets that get placed together in a
single file.

Bundles will (generally) contain only assets in the same language:

| Bundle Name  | Assets                      |
| ------------ | --------------------------- |
| `index.html` | `index.html`                |
| `app.css`    | `app.css`                   |
| `app.js`     | `app.js`, `navbar.js`, etc. |

Some assets are considered "entry" points into your app, and will stay as
separate bundles. For example, if your `index.html` file links to an
`about.html` file, they won't be merged together.

| Bundle Name  | Assets       | Entry URL |
| ------------ | ------------ | --------- |
| `index.html` | `index.html` | `/`       |
| `about.html` | `about.html` | `/about`  |

### Sources

"Sources" are the files that contain the source code to your app before being
compiled by Parcel.

Parcel discovers these sources by following their dependencies on one another
starting at your "entries".

These entries will be one of:

1. `$ parcel <...entries>`
2. `~/package.json#source`
3. `./src/index.*`
4. `./index.*`

From there, everything those assets depend on will be considered a "source" in
Parcel.

### Targets

When Parcel runs, it can build your asset graph in multiple different ways
simultaneously. These are called "targets".

For example, you could have a "modern" target that _targets_ newer browsers
and a "legacy" target for older browsers.

Sources get mapped to targets,

#### Target Configuration

In the most explicit form, targets are configured via the
`package.json#targets` field.

```js
{
  "app": "dist/browser/index.js",
  "appModern": "dist/browserModern/index.js",
  "targets": {
    "app": { /* target env */ },
    "appModern": { /* target env */ }
  }
}
```

Each target has a name which corresponds to a top-level `package.json` field
such as `package.json#main` or `package.json#browser` which specify the primary
entry point for that target.

Inside each of those targets contains the target's environment configuration:

| Option               | Possible values | Description |
| -------------------- | --------------- | ----------- |
| `context`            | `'node' \| 'browser' \| 'web-worker' \| 'electron-main' \| 'electron-renderer'` | Where the bundle should run |
| `includeNodeModules` | `boolean \| [String]` | Whether to bundle all/none/some `node_module` dependency  |
| `outputFormat`       | `'global' \| 'esmodule' \| 'commonjs'` | Which type of imports/exports should be emitted|
| `publicUrl`          | `string` | The public url of the bundle at runtime |
| `isLibrary`          | `boolean` | Library as in 'npm library' |
| `sourceMap`          | `boolean \| {inlineSources?: boolean, sourceRoot?: string, inline?: boolean}` | Enable/disable sourcemap and set options
| `engines`            | Engines | Same as `package.json#engines` |


However, a lot of the normal configuration you might want will already have
defaults provided for you:

```cs
targets = {
  main: {
    engines: {
      node: value("package.json#engines.node"),
      browsers: unless exists("package.json#browser") then value("package.json#browserlist")
    },
    isLibrary: true
  },
  module: {
    engines: {
      node: value("package.json#engines.node"),
      browsers: unless exists("package.json#browser") then value("package.json#browserlist")
    },
    isLibrary: true
  },
  browser: {
    engines: {
      browsers: value("package.json#browserslist")
    },
    isLibrary: true
  },
  ...value("package.json#targets"),
}
```

### Environments

Environments tell Parcel how to transform and bundle each asset. They tell
Parcel if an asset is going to be run in a browser or in NodeJS/Electron.

They also tell Parcel's transform plugins how they should run. They tell
[Babel](http://babeljs.io/docs/en/babel-preset-env#targetsbrowsers) or
[Autoprefixer](https://github.com/postcss/autoprefixer#browsers) what browsers
your asset is targetting.

You can configure environments through your targets.

```json
{
  "targets": {
    "main": {
      "engines": {
        "node": ">=4.x",
        "electron": ">=2.x",
        "browsers": ["> 1%", "not dead"]
      }
    }
  }
}
```

When one asset depends on another, the environment is inherited from its
parent. But how you depend on the asset can change some properties of that
environment.

For example:

```js
navigator.serviceWorker.register('./service-worker.js');
```

```js
let childEnvironment = {...parentEnvironment, browserContext: 'service-worker'};
```

### Caching

Parcel will create a `/.parcel-cache` directory. It will be filled with
directories with two letters, which are the start of a hash which is finished
by the names of the JSON files inside.

```
/.parcel-cache
  /00/
    213debd8ddd45819b79a3a974ed487.json
    40ae9b581afc53841307a4b3c2463d.json
    63a9dd58fc1e8f8bb819759ea9793c.json
    ...
  /01/
  /../
  /zy/
  /zz/
```

It follows this weird structure in order to avoid too many files being created
in a single directory, which degrades file system performance.

## Asset Resolution

Parcel follows the Node module resolution algorithm with a few additions.

### Local Paths

```
./path/to/file
./path/to/file.js
```

These follow the [Node module resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together).

### Package Paths

```
preact
lodash/cloneDeep
@sindresorhus/is
```

These follow the [Node module resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together).

### URLs

```
https://unpkg.com/preact@8.2.9/dist/preact.min.js
```

Parcel by default will ignore URL dependencies, other resolver plugins may
choose to do something with them.

### Tilde Paths

```
~/src/file.js
```

Only when used outside of `node_modules` directories, the `~` is replaced by an
absolute path to the closest package root:

```sh
/path/to/app #(/package.json)
```

To form a path that looks like:

```
/path/to/app/src/file.js
```

Then it follows the [Node module resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together).

### Aliases

Aliases come in two forms:

1. Package Aliases: `react -> preact`
2. File/Directory Aliases: `utils` -> `./src/utils`

```json
{
  "name": "my-project",
  "alias": {
    "react": "preact-compat",
    "react-dom": "preact-compat",
    "utils": "./src/utils",
    "components": "./src/components"
  }
}
```

There are a couple of rules:

1. Aliases will only be respected when specified outside of `node_modules`.
2. Aliases specified outside of `node_modules` will affect assets inside of `node_modules`.
3. Aliases cannot build off of other aliases.
4. Only one alias will be applied at a time.
5. Aliases must be valid npm package names.

## Plugins

### Resolvers

When one asset depends on another through an asset specifier, the resolver is
responsible for determining what asset is being requested.

See [Asset Resolution](#asset-resolution) for more details.

```json
{
  "resolvers": ["@parcel/resolver-v1"]
}
```

**Official Resolvers:**

- `@parcel/resolver-v1`

### Transformers

transformers _transform_ single assets as they are discovered and added to the
asset graph. They mostly call out to different compilers and preprocessors.

```json
{
  "transformers": {
    "*.js": ["@parcel/transformer-babel"]
  }
}
```

**Official Transformers:**

- `@parcel/transformer-babel`
- `@parcel/transformer-coffeescript`
- `@parcel/transformer-glsl`
- `@parcel/transformer-graphql`
- `@parcel/transformer-json`
- `@parcel/transformer-json5`
- `@parcel/transformer-less`
- `@parcel/transformer-posthtml`
- `@parcel/transformer-postcss`
- `@parcel/transformer-pug`
- `@parcel/transformer-raw`
- `@parcel/transformer-reason`
- `@parcel/transformer-rust`
- `@parcel/transformer-stylus`
- `@parcel/transformer-toml`
- `@parcel/transformer-typescript`
- `@parcel/transformer-vue`
- `@parcel/transformer-wasm`
- `@parcel/transformer-webmanifest`
- `@parcel/transformer-yaml`
- `@parcel/transformer-elm`
- ...

### Bundlers

Bundlers accept the entire asset graph and turn it into sets of bundles.

```json
{
  "bundler": "@parcel/bundler-default"
}
```

**Official Bundlers:**

- `@parcel/bundler-default`

### Namers

Namers accept a bundle and return a filename for that bundle.

```json
{
  "namers": ["@parcel/namer-default"]
}
```

**Official Namers:**

- `@parcel/namer-default`

### Runtimes

Runtimes get called after the bundler phase and generate an asset which gets
included in the final bundle.

```json
{
  "runtimes": ["@parcel/runtime-js", "@parcel/runtime-browser-hmr"]
}
```

**Official Runtimes:**

- `@parcel/runtime-js`
- `@parcel/runtime-hmr`

### Packagers

Packagers determine how to merge different asset types into a single bundle.

```json
{
  "packagers": {
    "*.css": "@parcel/packager-css"
  }
}
```

**Official Packagers:**

- `@parcel/packager-html`
- `@parcel/packager-js`
- `@parcel/packager-css`
- `@parcel/packager-wasm`
- `@parcel/packager-raw`

### Optimizers

Optimizers are similar to transformers, but they accept a bundle instead
of a single asset.

```json
{
  "optimizers": {
    "*.js": ["@parcel/optimizer-terser"],
    "*.css": ["@parcel/optimizer-csso"]
  }
}
```

**Official Optimizers:**

- `@parcel/packager-terser`
- `@parcel/packager-csso`
- [todo]

### Reporters

Reporters receive events as they happen and can either use the Parcel logger to
output to stdout/stderr or they can return assets to be generated on the file
system.

```json
{
  "reporters": ["@parcel/reporter-cli", "@parcel/reporter-dev-server"]
}
```

**Official Reporters:**

- `@parcel/reporter-cli`
- `@parcel/reporter-dev-server`
- [todo]

### Validators

Validators emit errors for source code after a build is completed.
For example, type checking and linting.

```json
{
  "validators": {
    "*.ts": ["@parcel/validator-typescript"]
  }
}
```

**Official Validators:**

- `@parcel/validator-typescript`
- `@parcel/validator-eslint`
- [todo]

## Creating Plugins

### Naming

All plugins must follow a naming system:

|            | Official package           | Community packages        | Private company/scoped team packages |
| ---------- | -------------------------- | ------------------------- | ------------------------------------ |
| Configs    | `@parcel/config-{name}`    | `parcel-config-{name}`    | `@scope/parcel-config[-{name}]`      |
| Resolvers  | `@parcel/resolver-{name}`  | `parcel-resolver-{name}`  | `@scope/parcel-resolver[-{name}]`    |
| Transformers | `@parcel/transformer-{name}` | `parcel-transformer-{name}` | `@scope/parcel-transformer[-{name}]`   |
| Bundlers   | `@parcel/bundler-{name}`   | `parcel-bundler-{name}`   | `@scope/parcel-bundler[-{name}]`     |
| Namers     | `@parcel/namer-{name}`     | `parcel-namer-{name}`     | `@scope/parcel-namer[-{name}]`       |
| Runtimes   | `@parcel/runtime-{name}`   | `parcel-runtime-{name}`   | `@scope/parcel-runtime[-{name}]`     |
| Packagers  | `@parcel/packager-{name}`  | `parcel-packager-{name}`  | `@scope/parcel-packager[-{name}]`    |
| Optimizers | `@parcel/optimizer-{name}` | `parcel-optimizer-{name}` | `@scope/parcel-optimizer[-{name}]`   |
| Reporters  | `@parcel/reporter-{name}`  | `parcel-reporter-{name}`  | `@scope/parcel-reporter[-{name}]`    |
| Validators | `@parcel/validator-{name}` | `parcel-validator-{name}`| `@scope/parcel-validator[-{name}]`    |

The `{name}` must be descriptive and directly related to the purpose of the
package. Someone should be able to have an idea of what the package does simply
by reading the name in a `.parcelrc` or `package.json#devDependencies`.

```
parcel-transformer-posthtml
parcel-packager-wasm
parcel-reporter-graph-visualizer
```

If your plugin adds support for a specific tool, please use the name of the
tool.

```
parcel-transformer-es6 (bad)
parcel-transformer-babel (good)
```

If your plugin is a reimplementation of something that exists, try naming it
something that explains why it is a separate:

```
parcel-transformer-better-typescript (bad)
parcel-transformer-typescript-server (good)
```

We ask that community members work together and when forks happen to try and
resolve them. If someone made a better version of your plugin, please consider
giving the better package name over, have them make a major version bump, and
redirect people to the new tool.

### Versioning

You must follow semantic versioning (to the best of your ability). No, it's not
the perfect system, but it's the best one we have and people do depend on it.

If plugin authors intentionally don't follow semantic versioning, Parcel may
start warning users that they should be locking down the version number for
your plugin.

> Warning: The plugin "parcel-transform-typescript" does not follow semantic
> versioning. You should lock the version range down so your code does not
> break when they make changes. Please upvote this issue to encourage them to
> follow semver: https://github.com/user/parcel-transform-typescript/issues/43

### Engines

You must specify a `package.json#engines.parcel` field with the version range
of Parcel that your plugin supports:

```json
{
  "name": "parcel-transform-imagemin",
  "engines": {
    "parcel": "2.x"
  }
}
```

If you do not specify this field, Parcel will output a warning:

```
Warning: The plugin "parcel-transform-typescript" needs to specify a `package.json#engines.parcel` field with the supported Parcel version range.
```

If you do specify the parcel engine field and the user is using an incompatible
version of Parcel, they will see an error:

```
Error: The plugin "parcel-transform-typescript" is not compatible with the
current version of Parcel. Requires "2.x" but the current version is "3.1.4"
```

Parcel uses node-semver to match version ranges.

## Plugin APIs

There are several different types of plugins. They all look very similar, but
are kept separate so we can have strict contracts one what each one is allowed
to do.

There are some rules that should be followed across every type of plugin:

- **Stateless** — Avoid any kind of state, it will likely be the source of bugs
  for your users. For example, the same transform may exist in multiple
  separate workers which are not allowed to communicate with one another, state
  will not work as expected.
- **Pure** — Given the same input, a plugin must produce the same output, and
  you must not have any observable side effects, or implicit dependencies.
  Otherwise Parcel's caching will break and your users will be sad. You should
  never have to tell users to delete their caches.

The plugin APIs all follow a common shape:

```js
import {NameOfPluginType} from '@parcel/plugin';

export default new NameOfPluginType({
  async methodName(opts: JSONObject): Promise<JSONObject> {
    return result;
  }
});
```

They are made up of modules with well-known named exports of async functions
that:

- Accept a strictly validated JSON-serializable `opts` object.
- Return a strictly validated JSON-serializable `vals` object.

If something you need is not being passed through `opts`, please come talk to
the Parcel team about it. Avoid trying to get information yourself from other
sources, especially from the file system.

### Resolvers

Resolvers get called with an asset request (consisting of a source file path
and the specifier of what is being requested) which it then attempts to
resolve. If the resolver isn't sure how to handle a request, it can also return
`null` and pass it to the next resolver in the chain.

```js
import {Resolver} from '@parcel/plugin';

export default new Resolver({
  async resolve({dependency}) {
    // ...
    return {filePath} || null;
  }
});
```

### Transformers

Transformers _transform_ single assets as they are discovered and added to the
asset graph. They mostly call out to different compilers and preprocessors.

```js
import {Transform} from '@parcel/plugin';

export default new Transform({
  async parse({asset}) {
    // ...
    return ast;
  },

  async transform({asset}) {
    // ...
    return [assets];
  },

  async generate({asset}) {
    // ...
    return {code, map};
  }
});
```

### Bundler

Bundlers accept the entire asset graph and modify it to add bundle nodes that group the assets
into output bundles.

```js
import {Bundler} from '@parcel/plugin';

export default new Bundler({
  async bundle({graph}) {
    // ...
  },

  async optimize({graph}) {
    // ...
  }
});
```

### Namers

Namers accept a bundle and output a filename for that bundle.

```js
import {Namer} from '@parcel/plugin';

export default new Namer({
  async name({bundle, bundleGraph}) {
    // ...
    return name;
  }
});
```

### Runtimes

Runtimes accept a bundle and return assets to be inserted into that bundle.

```js
import {Runtime} from '@parcel/runtime';

export default new Runtime({
  async apply({bundle, bundleGraph}) {
    // ...
    return assets;
  }
});
```

### Packagers

Packagers determine how to merge different asset types into a single bundle.

```js
import {Packager} from '@parcel/plugin';

export default new Packager({
  async package({bundle}) {
    // ...
    return {contents, map};
  },
});
```

### Optimizers

Optimizers are similar to transformers, but they accept a bundle instead
of a single asset.

```js
import {Optimizer} from '@parcel/plugin';

export default new Optimizer({
  async optimize({bundle, contents, map}) {
    // ...
    return {contents, map};
  }
});
```

### Reporters

Reporters receive events as they happen and can output to stdout/stderr,
or perform other actions.

```js
import {Reporter} from '@parcel/plugin';

export default new Reporter({
  async report({ event: { type, ... } }) {
    // ...
  }
});
```

### Validators

Validators receive an asset, and can throw errors if that asset is invalid
in some way, e.g. type errors or linting errors.

```js
import {Validator} from '@parcel/plugin';

export default new Validator({
  async validate({asset}) {
    // ...
    throw error;
  }
});
```
Some validators (such as `@parcel/validator-typescript`) may wish to maintain a project-wide cache for efficiency. For these cases, it is appropriate to use a different interface where parcel hands _all_ changed files to the validator at the same time:

```js
import {Validator} from '@parcel/plugin';

export default new Validator({
  async validateAll({assets}) {
    // ...
    throw error;
  }
});
```

If your plugin implements `validateAll`, Parcel will make sure to always invoke this method on the same thread (so that your cache state is accessible).

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/parcel-bundler/parcel/blob/v2/LICENSE) file for details
