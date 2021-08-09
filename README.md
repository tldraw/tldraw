# tldraw

A tiny little drawing app.

Visit [tldraw.com](https://tldraw.com/).

## About

The tldraw project has three parts:

- The [tldraw.com](https://www.tldraw.com/) app
- [@tldraw/tldraw](), the tldraw editor as a standalone component
- [@tldraw/core](), the tldraw renderer as a standalone component

You can find the source for each project in this repository.

## Signposting

This project is a monorepo that contains:

- **www**: the main [tldraw.com](https://tldraw.com) app
- **packages/core**: the @tldraw/core renderer component and utilities
- **packages/tldraw**: the @tldraw/tldraw editor component
- **packages/app**: an app to help with package development

## Support

To support this project (and gain access to the project while it is in development) you can [sponsor the author](https://github.com/sponsors/steveruizok) on GitHub. Thanks!

## Author

- [steveruizok](https://twitter.com/steveruizok)
- ...and more!

## Local Development

To work on the development app (at `packages/app`):

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

4. Open the local site at `https://localhost:8080`.
