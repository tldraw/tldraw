# Releases

## How tldraw is versioned

Unlike many JavaScript packages distributed on [NPM](https://www.npmjs.com/), the tldraw SDK does not follow [semantic versioning](https://semver.org/) in its release versions. Here's what we do instead:

- Major version bumps are very rare and we reserve them for special changes that signify a paradigm shift of some kind.
- Minor version bumps are released on a regular cadence. At the time of writing that cadence is monthly. **They may contain breaking changes**. We aim to make breaking changes as minimally disruptive as possible by providing warnings several releases in advance, and by providing tooling to help you migrate your code. We recommend updating tldraw at a similar pace to our release cadence, and be sure to check the release notes.
- Patch version bumps are for bugfixes and hotfixes that can't wait for the next cadence release.

## How to publish a new major or minor release

New cadence releases are published from `production`. You trigger a release manually by running the workflow defined in `publish.yml`.

### Before you publish

The release notes are read from two places at publish time, and both have to be current:

- **`production`'s `apps/docs/content/releases/next.mdx`.** `prepack.ts` generates the `RELEASE_NOTES.md` that ships inside the `tldraw` npm package from the checkout being published, so whatever `next.mdx` says on `production` at that moment is baked into the tarball. It can't be fixed afterwards without a patch release. During the freeze `production` only moves by hotfix, so release-notes updates merged to `main` have to be brought over (the `dotcom-hotfix-please` label on the release-notes PR does this). The gate is an empty diff:

  ```sh
  git fetch origin production main
  git diff --stat origin/production origin/main -- apps/docs/content/releases/next.mdx
  ```

- **The draft GitHub release named `vX.Y.0`.** `publish-new.ts` publishes its body verbatim and refuses to run if it doesn't exist. The `update-release-notes` skill keeps it in sync with `next.mdx` (`.claude/skills/update-release-notes/scripts/update-draft-release.sh`); re-run that if `next.mdx` changed after the last sync.

1. Go [here](https://github.com/tldraw/tldraw/actions/workflows/publish.yml), select the `production` branch, and click the 'Run workflow' button.
2. Set the publish type to `new`.
3. Fill out the form that appears. You can leave the defaults as they are if you want to publish a new 'minor' release. If you want to publish a new 'major' release, select that option from the dropdown.
4. If you need to publish an exact version number, select the override option and provide the version number, like `3.4.0`.

When you click the 'run' button after selecting how to bump the version number, the github action will do the following things:

- Update the version numbers in package.json files.
- Publish the draft GitHub release for the new version.
- Publish the new packages to npm.
- Create a new release branch for the new version. e.g. for version `3.4.0` it will create a branch called `v3.4.x`.
- Push `production`'s docs and examples to `docs-production`, and its bemo worker to `bemo-production`.
- Trigger a version bump on `main` so its package versions match.

### After you publish

- Check the notes that shipped inside the package match what you expected. The section for the new version should have the same entries as `next.mdx` did on `production`:

  ```sh
  curl -sL "$(npm view tldraw@X.Y.0 dist.tarball)" | tar -xzO package/RELEASE_NOTES.md | head -40
  ```

- The version bump lands on `main`, not `production`, so the publish itself doesn't push to `production`. The post-release `update-release-notes` run (which archives `next.mdx` to `vX.Y.0.mdx` and needs `docs-hotfix-please` to reach the new release branch) is triggered by the next `production` push, normally the post-launch dotcom release from `main`. Dispatch `update-release-notes.yml` by hand if you want the docs page sooner.

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
