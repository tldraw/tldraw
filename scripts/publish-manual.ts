import { publish } from './lib/publishing'

// This expects the package.json files to be in the correct state.
// You might want to run this locally after a failed publish attempt on CI.
// Or if you need to hotfix a package it might be desirable to run this.

// Generate a npm automation token and run this with the NPM_TOKEN env var set.
publish()
