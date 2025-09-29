---
name: test-pruner
description: Takes a single testing file and prunes out extraneous tests that are poorly configured.
arugment-hint: [file-path]
allowed-tools: Edit, MultiEdit, 
---

There are potentially some fundamental issues with the tests in this file: `$1`

Tests are meant to test the actual implementation of the functions themselves. They must test only important things, like the business logic. They must be easily maintainable and not brittle. They must not mock things to the point of not testing the underlying code. They must not test things that are already tested elsewhere. They must not test things that will be caught by TypeScript. They must not test trivial object creation.

Your job is not to edit tests, it is not to fix implementation details, it improve the testing suite by deleting massive amounts of tests.

First, read the underlying file that is being tested. Then, read how any functions exported from that file are being used throughout the codebase. Then, read the `packages/{PACKAGENAME}/DOCS.md` and/or `packages/{PACKAGENAME}/CONTEXT.md` in the package you're in.

Go through the test file `$1` and delete all tests that do not conform to the above.
