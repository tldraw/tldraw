# Contributing

Thank you for your interest in contributing to [tldraw](https://github.com/tldraw/tldraw)! We welcome any contributions to the code base and the documentation.

## Create an Issue!

Before jumping into the code, please [create an issue](https://github.com/tldraw/tldraw/issues/new/choose) to discuss your proposed changes. This will help us to make sure that your changes are aligned with the project goals and that you are not duplicating work that is already in progress.

If you are not sure whether your changes are needed, feel free to create an issue anyway and we can discuss it there. Once we have agreed on the changes, you can start working on them.

## Environment

- Ensure you have the latest version of Node and Yarn.
- Run `yarn` to install all needed dev dependencies.

## Making Changes

Pull requests are encouraged. If you want to add a feature or fix a bug:

1. [Fork](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo) and [clone](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the [repository](https://github.com/tldraw/tldraw)
2. [Create a separate branch](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/managing-branches) for your changes
3. Make your changes, and ensure that it is formatted by [Prettier](https://prettier.io) and type-checks without errors in [TypeScript](https://www.typescriptlang.org/)
4. Write tests that validate your change and/or fix.
5. Run `yarn build` and then run tests with `yarn test` (for all packages) or `yarn test:core` (for only changes to the core @tldraw/tldraw package).
6. For package changes, add docs inside the `/packages/*/README.md`. They will be copied on build to the corresponding `/docs/packages/*/index.md` file.
7. Create a changeset by running `yarn changeset`. [More info](https://github.com/atlassian/changesets).
8. Push your branch and open a PR. 🚀

Your PR will be reviewed and merged in within a day or two if everything looks good.
