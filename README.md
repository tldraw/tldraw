# TypeScript Boilerplate for 2021

[![Build and test status](https://github.com/tldraw/tldraw/workflows/Lint%20and%20test/badge.svg)](https://github.com/metachris/micropython-ctl/actions?query=workflow%3A%22Build+and+test%22)

TypeScript project boilerplate with modern tooling, for Node.js programs, libraries and browser modules. Get started quickly and right-footed 🚀

- [TypeScript 4](https://www.typescriptlang.org/)
- Optionally [esbuild](https://esbuild.github.io/) to bundle for browsers (and Node.js)
- Linting with [typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) ([tslint](https://palantir.github.io/tslint/) is deprecated)
- Testing with [Jest](https://jestjs.io/docs/getting-started) (and [ts-jest](https://www.npmjs.com/package/ts-jest))
- Publishing to npm
- Continuous integration ([GitHub Actions](https://docs.github.com/en/actions) / [GitLab CI](https://docs.gitlab.com/ee/ci/))
- Automatic API documentation with [TypeDoc](https://typedoc.org/guides/doccomments/)

See also the introduction blog post: **[Starting a TypeScript Project in 2021](https://www.metachris.com/2021/03/bootstrapping-a-typescript-node.js-project/)**.

## Getting Started

```bash
# Clone the repository (you can also click "Use this template")
git clone https://github.com/tldraw/tldraw.git your_project_name
cd your_project_name

# Edit `package.json` and `tsconfig.json` to your liking
...

# Install dependencies
yarn install

# Now you can run various yarn commands:
yarn cli
yarn lint
yarn test
yarn build-all
yarn ts-node <filename>
yarn esbuild-browser
...
```

- Take a look at all the scripts in [`package.json`](https://github.com/tldraw/tldraw/blob/master/package.json)
- For publishing to npm, use `yarn publish` (or `npm publish`)

## esbuild

[esbuild](https://esbuild.github.io/) is an extremely fast bundler that supports a [large part of the TypeScript syntax](https://esbuild.github.io/content-types/#typescript). This project uses it to bundle for browsers (and Node.js if you want).

```bash
# Build for browsers
yarn esbuild-browser:dev
yarn esbuild-browser:watch

# Build the cli for node
yarn esbuild-node:dev
yarn esbuild-node:watch
```

You can generate a full clean build with `yarn build-all` (which uses both `tsc` and `esbuild`).

- `package.json` includes `scripts` for various esbuild commands: [see here](https://github.com/tldraw/tldraw/blob/master/package.json#L23)
- `esbuild` has a `--global-name=xyz` flag, to store the exports from the entry point in a global variable. See also the [esbuild "Global name" docs](https://esbuild.github.io/api/#global-name).
- Read more about the esbuild setup [here](https://www.metachris.com/2021/04/starting-a-typescript-project-in-2021/#esbuild).
- esbuild for the browser uses the IIFE (immediately-invoked function expression) format, which executes the bundled code on load (see also https://github.com/evanw/esbuild/issues/29)

## Tests with Jest

You can write [Jest tests](https://jestjs.io/docs/getting-started) [like this](https://github.com/tldraw/tldraw/blob/master/src/main.test.ts):

```typescript
import { greet } from "./main";

test("the data is peanut butter", () => {
  expect(1).toBe(1);
});

test("greeting", () => {
  expect(greet("Foo")).toBe("Hello Foo");
});
```

Run the tests with `yarn test`, no separate compile step is necessary.

- See also the [Jest documentation](https://jestjs.io/docs/getting-started).
- The tests can be automatically run in CI (GitHub Actions, GitLab CI): [`.github/workflows/lint-and-test.yml`](https://github.com/tldraw/tldraw/blob/master/.github/workflows/lint-and-test.yml), [`.gitlab-ci.yml`](https://github.com/tldraw/tldraw/blob/master/.gitlab-ci.yml)
- Take a look at other modern test runners such as [ava](https://github.com/avajs/ava), [uvu](https://github.com/lukeed/uvu) and [tape](https://github.com/substack/tape)

## Documentation, published with CI

You can auto-generate API documentation from the TyoeScript source files using [TypeDoc](https://typedoc.org/guides/doccomments/). The generated documentation can be published to GitHub / GitLab pages through the CI.

Generate the documentation, using `src/main.ts` as entrypoint (configured in package.json):

```bash
yarn docs
```

The resulting HTML is saved in `docs/`.

You can publish the documentation through CI:

- [GitHub pages](https://pages.github.com/): See [`.github/workflows/deploy-gh-pages.yml`](https://github.com/tldraw/tldraw/blob/master/.github/workflows/deploy-gh-pages.yml)
- [GitLab pages](https://docs.gitlab.com/ee/user/project/pages/): [`.gitlab-ci.yml`](https://github.com/tldraw/tldraw/blob/master/.gitlab-ci.yml)

This is the documentation for this boilerplate project: https://metachris.github.io/typescript-boilerplate/

## References

- **[Blog post: Starting a TypeScript Project in 2021](https://www.metachris.com/2021/03/bootstrapping-a-typescript-node.js-project/)**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [tsconfig docs](https://www.typescriptlang.org/tsconfig)
- [esbuild docs](https://esbuild.github.io/)
- [typescript-eslint docs](https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/README.md)
- [Jest docs](https://jestjs.io/docs/getting-started)
- [GitHub Actions](https://docs.github.com/en/actions), [GitLab CI](https://docs.gitlab.com/ee/ci/)

## Feedback

Reach out with feedback and ideas:

- [twitter.com/metachris](https://twitter.com/metachris)
- [Create a new issue](https://github.com/tldraw/tldraw/issues)
