# Releases

## How tldraw is versioned

**We do not follow SemVer**.

- Major version bumps are very rare and we reserve them for special changes that signify a paradigm shift of some kind.
- Minor version bumps are released on a regular cadence. At the time of writing that cadence is monthly. **They may contain breaking changes**. We aim to make breaking changes as minimally disruptive as possible by providing warnings several releases in advance, and by providing tooling to help you migrate your code. We recommend updating tldraw at a similar pace to our release cadence, and be sure to check the release notes.
- Patch version bumps are for bugfixes and hotfixes that can't wait for the next cadence release.

## How to publish a new major or minor release

New cadence releases are published from `main`. You trigger a release manually by running the workflow defined in `publish-new.yml`.

1. Go [here](https://github.com/tldraw/tldraw/actions/workflows/publish-new.yml) and click the 'Run workflow' button.
2. Fill out the form that appears. You can leave the defaults as they are if you want to publish a new 'minor' release. If you want to publish a new 'major' release, select that option from the dropdown.
3. If you need to put the repo in 'prerelease' mode you can select the override option and provide a version number with a prerelease tag, like `3.4.0-rc.1`.

   This is useful for providing a period of time for both us and our users to test a new release before it receives the `latest` tag on npm.

   After switching into prerelease mode, any further 'minor' or 'major' releases will only increment the prerelease tag, like `3.4.0-rc.2`, `3.4.0-rc.3`, etc.

   When you are ready to publish the final release, you can switch back to the `latest` tag by selecting the override option and providing a version number without a prerelease tag, like `3.4.0`.

When you click the 'run' button after selecting how to bump the version number, the github action will do the following things:

- Update the version numbers in package.json files.
- Update the changelog.
- Create a new release on github with the release notes from the changelog entry.
- Publish the new packages to npm.
- Create a new release branch for the new version. e.g. for version `3.4.0` it will create a branch called `v3.4.x`. (this is not done for prerelease versions)

## How to publish a new patch release

1. Make sure your git repo is up-to-date.

   `git fetch`

2. Check out the latest release branch.

   New major or minor releases will be given their own 'release branch' at publish time, with a name like `v2.0.x`. Every release branch starts with a `v` and ends in `.x`. Patch releases are published from these release branches.

   To see the latest tldraw version number run `npm show tldraw version`. Then checkout the release branch for that number by prefixing the `v` and replacing the patch number with `x`. For example, if the latest version is `3.4.3`, you would run

   `git checkout v3.4.x`

   You can also patch older release branches if you need to. For example, if the latest version is `3.4.3` but you need to patch `2.8.2`, you would run

   `git checkout v2.8.x`

3. Create a new branch based on the release branch.

   `git checkout -b david/my-helpful-patches`

   Replace `david/my-helpful-patches` with a branch name that makes sense for the patches you are about to make.

4. Cherry-pick the commits you want to include in the patch release.

   `git cherry-pick <commit-hash>`

   You can cherry-pick multiple commits if you want to include multiple bugfixes in the patch release.

5. Push the branch and make a PR targeting the release branch.

6. Merge the PR.

That's it! The patch release will be published automatically after merging. Changelog and version number updates will be committed back to the release branch, and deliberately not to `main`.

## What about documentation?

Our docs site is published in tandem with our npm packages. When you publish a new release, the docs site will be updated automatically so that the docs are always in sync with the latest version of tldraw.

If you make a docs change that you want to publish independently of a new cadence release, you can do so by following the same process as for creating a patch release. This will automatically detect that the packages themselves have not changed and will only update the docs site.
