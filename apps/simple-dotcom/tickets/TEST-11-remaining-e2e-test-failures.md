# TEST-11: Document Bugs Causing Remaining E2E Test Failures

**Status:** Open
**Priority:** Medium
**Estimate:** 8 hours
**Dependencies:** None
**Related:** TEST-05 through TEST-10

## Problem

After fixing major test infrastructure issues (navigation, fixtures, workspace creation), several e2e tests are still failing. These failures need to be addressed systematically to reach full test coverage.

## Root Causes

Tests that fail:

- [chromium] › e2e/dashboard.spec.ts:83:7 › Global Dashboard › Workspace CRUD from Dashboard › should create new workspace and see it in dashboard
- [chromium] › e2e/dashboard.spec.ts:421:7 › Global Dashboard › Recent Documents Display (NAV-07) › should update recent list when reopening an existing recent document
- [chromium] › e2e/dashboard.spec.ts:478:7 › Global Dashboard › Recent Documents Display (NAV-07) › should display workspace context for each recent document
- [chromium] › e2e/dashboard.spec.ts:515:7 › Global Dashboard › Dashboard Data Updates › should reflect workspace removal when user is removed from workspace
- [chromium] › e2e/dashboard.spec.ts:574:7 › Global Dashboard › Empty States › should show empty state for new user with only private workspace
- [chromium] › e2e/document-archive-delete.spec.ts:4:6 › Document Archive and Hard Delete › workspace member can archive document via archive endpoint
- [chromium] › e2e/document-archive-delete.spec.ts:68:6 › Document Archive and Hard Delete › only workspace owner can hard delete document
- [chromium] › e2e/document-archive-delete.spec.ts:136:6 › Document Archive and Hard Delete › hard delete requires confirmation header
- [chromium] › e2e/document-archive-delete.spec.ts:185:6 › Document Archive and Hard Delete › cannot archive already archived document
- [chromium] › e2e/document-archive-delete.spec.ts:229:6 › Document Archive and Hard Delete › member cannot hard delete in workspace where they are not owner
- [chromium] › e2e/document-crud.spec.ts:197:6 › Document CRUD Operations › archived documents do not appear in active lists
- [chromium] › e2e/document-metadata.spec.ts:4:6 › Document Metadata Display › displays metadata for workspace members
- [chromium] › e2e/document-metadata.spec.ts:109:6 › Document Metadata Display › updates metadata when document is modified
- [chromium] › e2e/document-metadata.spec.ts:173:6 › Document Metadata Display › shows archived status in metadata
- [chromium] › e2e/document-ui-operations.spec.ts:4:6 › Document UI Operations (NAV-03A) › can create a document via UI
- [chromium] › e2e/document-ui-operations.spec.ts:54:6 › Document UI Operations (NAV-03A) › validates document name is required
- [chromium] › e2e/invitation-links.spec.ts:5:6 › Invitation Links › owner can create invitation link
- [chromium] › e2e/invitation-links.spec.ts:125:6 › Invitation Links › owner can disable and enable invitation link
- [chromium] › e2e/invitation-links.spec.ts:193:6 › Invitation Links › owner can regenerate invitation link
- [chromium] › e2e/invitation-links.spec.ts:260:6 › Invitation Links › non-owner cannot see invitation management UI
- [chromium] › e2e/invitation-links.spec.ts:334:6 › Invitation Links › handles network errors gracefully
- [chromium] › e2e/invite.spec.ts:48:7 › Workspace Invitation Flow › Unauthenticated User Flow › should redirect to login with preserved redirect URL
- [chromium] › e2e/invite.spec.ts:89:7 › Workspace Invitation Flow › Unauthenticated User Flow › should join workspace after signup
- [chromium] › e2e/invite.spec.ts:154:7 › Workspace Invitation Flow › Authenticated User Flow › should join workspace immediately when authenticated
- [chromium] › e2e/invite.spec.ts:187:7 › Workspace Invitation Flow › Authenticated User Flow › should show already member message
- [chromium] › e2e/invite.spec.ts:215:7 › Workspace Invitation Flow › Error Scenarios › should show error for disabled link
- [chromium] › e2e/invite.spec.ts:245:7 › Workspace Invitation Flow › Error Scenarios › should show error for regenerated token
- [chromium] › e2e/invite.spec.ts:282:7 › Workspace Invitation Flow › Redirect Preservation › should preserve redirect when switching between login and signup
- [chromium] › e2e/member-limit.spec.ts:4:6 › Workspace Member Limits › shows warning when approaching member limit
- [chromium] › e2e/member-limit.spec.ts:53:6 › Workspace Member Limits › prevents joining workspace when at member limit
- [chromium] › e2e/member-limit.spec.ts:123:6 › Workspace Member Limits › shows warning in API response when near limit
- [chromium] › e2e/member-management.spec.ts:5:6 › Member Management › owner can view and remove workspace members
- [chromium] › e2e/member-management.spec.ts:63:6 › Member Management › search and pagination work for large member lists
- [chromium] › e2e/ownership-transfer.spec.ts:4:7 › Ownership Transfer › owner can transfer ownership to another member
- [chromium] › e2e/workspace-modal-ux.spec.ts:65:6 › Workspace Modal UX (BUG-02 Fixes) › should prevent duplicate workspace names
- [chromium] › e2e/workspace.spec.ts:1123:7 › Workspace Management › Private Workspace Validation › should prevent renaming private workspace via API
- [chromium] › e2e/workspace.spec.ts:1201:7 › Workspace Management › Private Workspace Validation › should verify private workspace created on signup

## Implementation Plan

Work through the tests one by one and identify the root cause of the failure. Create bug reports for each failure. Do not proceed to the next test until the current test is fixed. For efficiency's sake, when running the tests, run them one by one (do not run the whole suite at once). Do not try to fix the tests; instead, only create bug reports for each failure.

Do not create new tickets if the failure is identical to a previously documented failure. In that case, add a note to the existing ticket.

## Acceptance Criteria

- [ ] All failing tests have been documented in bug reports
