# Snowpack monorepo

> ✨ POC repo demonstrating Snowpack powering a monorepo with React, TypeScript and React Fast Refresh.

## TLDR; demo packages
- `components` - a UI component library
- `launch-kit` - a "framework" which uses `components` 
- `app` - an application which uses the `launch-kit` framework
- `typescript-config` - shared Typescript config
- `prettier-config` - shared Prettier config

This monorepo uses React Fast Refresh, which allows hot module reloading while preserving state. The running `app` will be fast refreshed even if your code change comes from `components` (which isn't a direct dependency of `app`).

![image](https://user-images.githubusercontent.com/5167260/106462300-cb5d7c80-648d-11eb-9dd0-2aa95f8073d2.png)
This screenshot shows HMR updates coming from the different packages while the countdown timer state is preserved.

## Scripts

### yarn install

Installs all dependencies and links the monorepo packages together (yarn workspaces).
### yarn start

Runs the `app` package in development mode.
Open http://localhost:8080 to view it in the browser.

The page will reload with React fast refresh if you make edits in any of the monorepo packages.

### yarn build

Builds all packages. 
