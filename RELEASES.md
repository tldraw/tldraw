# How tldraw is published to npm

**We do not follow strict SemVer**.

- Major version bumps are rare and we reserve them for Big Important Stuff like architectural changes or major new features.
- Minor version bumps are 'cadence' releases. They happen on a regular schedule and contain a mix of new features and bugfixes. **They may contain breaking changes**. We aim to keep breaking changes as minimally disruptive as possible, but you should be aware that upgrading tldraw may involve reading through our release notes to resolve breakage. You should update regularly for the best experience, since we will be able to warn you of most upcoming breaking changes several releases in advance and give you a long time window to resolve issues.
- Patch version bumps are for bugfixes and hotfixes that can't wait for the next cadence release.

At the time of writing, our release cadence is monthly. This may have changed by the time you read this.

## How to publish a new major or minor release

New cadence releases are published from `main`. You trigger a release manually by running the github action called `Publish new packages from main`.

By default this will create a new 'minor' release, but you can choose to publish a 'major' by selecting that option in the github action's inputs form.

## How to publish a new patch release

1. Make sure your git repo is up-to-date.

   `git fetch`

2. Check out the latest release branch.

   New major or minor releases will be given their own 'release branch' at publish time, with a name like `v2.0.x`. Every release branch starts with a `v` and ends in `.x`. Patch releases are published from these release branches.

   To see the latest tldraw version number run `npm show tldraw version`. Then checkout the release branch for that number by prefixing the `v` and replacing the patch number with `x`. For example, if the latest version is `3.4.3`, you would run

   `git checkout v3.4.x`

   You can also patch 'previous' release branches if you need to. For example, if the latest version is `3.4.3` but you need to patch `2.8.2`, you would run

   `git checkout v2.8.x`

3. Create a new branch based on the release branch.

   `git checkout -b david/my-helpful-patches`

   Replace `david/my-helpful-patches` with a branch name that makes sense for the patches you are about to make.

4. Cherry-pick the commits you want to include in the patch release.

   `git cherry-pick <commit-hash>`

   You can cherry-pick multiple commits if you want to include multiple bugfixes in the patch release.

5. Push the branch and make a PR targeting the release branch.

6. Merge the PR.

That's it! The patch release will be published automatically after merging.

## What about documentation?

Our docs site is published in tandem with our npm packages. When you publish a new release, the docs site will be updated automatically so that the docs are always in sync with the latest version of tldraw.

If you make a docs change that you want to publish independently of a new cadence release, you can do so by following the same process as for creating a patch release. This will automatically detect that the packages themselves have not changed and will only update the docs site.
