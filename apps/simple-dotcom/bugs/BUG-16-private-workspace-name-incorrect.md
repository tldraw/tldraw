# BUG-16: Private Workspace Name Not Based on Email Prefix

**Status:** Open
**Priority:** Medium
**Estimate:** 2 hours
**Related Tests:** e2e/workspace.spec.ts:1123

## Problem

The private workspace name is not being generated correctly. Instead of using the email prefix, it's using "Playwright Worker 0" (or similar worker name).

## Error Details

```
Error: expect(received).toBe(expected)

Expected: "test-worker-0-0-1759692596864-ojtqyn's Workspace"
Received: "Playwright Worker 0's Workspace"
```

## Test Flow

1. Create a test user with email `test-worker-0-0-1759692596864-ojtqyn@example.com`
2. User signup creates a private workspace
3. **FAILS**: Private workspace is named "Playwright Worker 0's Workspace" instead of "test-worker-0-0-1759692596864-ojtqyn's Workspace"

## Root Cause

The private workspace naming logic is incorrectly determining the name source. It should be using:
- The user's email prefix (part before @) when display_name is not set
- But it's using something else (possibly worker display name, a default value, or test data)

This could be:
- A bug in the workspace creation code that generates the default name
- The test fixture setting an incorrect display_name
- The signup process using wrong data source for the workspace name

## Expected Behavior

When a user signs up without a display_name:
1. Their private workspace should be named `{email_prefix}'s Workspace`
2. For email `test@example.com`, workspace should be `test's Workspace`
3. The name should be based on the email prefix, not any other source

## Affected Tests

- `e2e/workspace.spec.ts:1123` - should prevent renaming private workspace via API
- `e2e/workspace.spec.ts:1201` - should verify private workspace created on signup

## Acceptance Criteria

- [ ] Private workspace is named using email prefix when display_name is not set
- [ ] Workspace name follows format `{email_prefix}'s Workspace`
- [ ] Test passes when run individually
