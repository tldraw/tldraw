# tldraw

A tiny little drawing app.

Visit [tldraw.com](https://tldraw.com/).

## Author

- [steveruizok](https://twitter.com/steveruizok)
- ...and more!

## Support

To support this project (and gain access to the project while it is in development) you can [sponsor the author](https://github.com/sponsors/steveruizok) on GitHub. Thanks!

## Documentation

In progress! Check the README files in [packages/core](packages/core/README.md) and [packages/tldraw](packages/tldraw/README.md).

## Examples

- [@tldraw/core example](https://codesandbox.io/s/tldraw-core-example-88c74)
- [@tldraw/tldraw example](https://codesandbox.io/s/tldraw-example-n539u)

## Local Development

### The tldraw packages

To work on the packages (@tldraw/core or @tldraw/tldraw), you'll want to run the (extremely fast) dev server.

1. Download or clone the repository.

   ```bash
   git clone https://github.com/tldraw/tldraw.git
   ```

2. Install dependencies.

   ```bash
   yarn
   ```

3. Start the development server.

   ```bash
   yarn start
   ```

4. Open the local site at `https://localhost:5000`.

### The tldraw app

To work on the app itself (that embeds @tldraw/tldraw), run the Next.js app. This won't directly respond to changes to packages, so for concurrent package dev work be sure to use the package dev server instead. (This is being worked on.)

1. Start the development server.

   ```bash
   yarn start:www
   ```

2. Open the local site at `https://localhost:3000`.
