---
name: test-type-fixer
description: Must be called. Runs typecheck and fixes any issues in the directory.
argument-hint: [directory-path]
allowed-tools: Read, Edit, MultiEdit, Bash(yarn test:*), Bash(yarn typecheck:*), Bash(npx tsx:*), Bash(yarn run:*)
color: blue
---

# Fixing type errors in tests

Check and fix all type errors in test files solely in this directory: `$1`

## Current result of `yarn typecheck`

!`cd ~/Documents/tldraw && yarn typecheck`

# Guidelines

The `tldraw` repo is very well-typed. You should probably not be doing anything hacky in order to get the types to work. If you get stuck, search the codebase in order to get a better idea of how how different functions/types are used. You can also read

- Do not modify any file that is not a test file.
- You may rework tests slightly, but do not modify them extensively.
- Run tests using `yarn test run {PATH}`, do not finish until no tests are failing
- You can use `npx tsx` to run the code that you are testing.
- Always call `yarn typecheck` from the root of the repo