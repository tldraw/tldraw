# Dotcom E2E conventions

Issue #9185 is moving dotcom tests toward user scenarios instead of isolated UI smoke tests. New collaborative dotcom coverage should prefer the scenario fixture in `fixtures/scenario-test.ts`.

## Scenario tests

- Name scenario files `*.scenario.spec.ts`. They run in the `chromium-scenarios` project with `fullyParallel: true`.
- Run the ordinary local/CI dotcom suite with `yarn e2e-dotcom` from the repo root, or `yarn workspace dotcom e2e` from this workspace. This runs the scenario project only.
- Run only the scenario suite without clearing stored auth with `yarn workspace dotcom e2e-scenarios`.
- Run the preserved legacy smoke suite with `yarn e2e-dotcom-smoke` from the repo root, or `yarn workspace dotcom e2e-smoke` from this workspace. These specs live in `tests/smoke`, still use the reset-based `chromium` project, and are intentionally separate from the default runner. They do not run on CI; migrate coverage out of `tests/smoke` into scenario tests as the follow-ups below are unblocked.
- Run both projects together with `yarn e2e-dotcom-all` from the repo root, or `yarn workspace dotcom e2e-all` from this workspace, when comparing old and new coverage.
- Use named actors from the fixture: `owner`, `member`, and `visitor`.
- Use `scenario.name('label')` for files and workspaces so test data is unique to the run.
- Do not reset the whole database or shared users in scenario tests. Stable Clerk test accounts are reused by worker, while files and workspaces are namespaced by scenario.
- Scenario actors use later Clerk test accounts than the legacy `chromium` project so explicit all-project runs can share a command while legacy tests still reset their own users.
- Actor contexts and pages are owned by the fixture and closed automatically.
- Use `scenario.createPersonalFile`, `scenario.createSharedFile`, `scenario.createGuestEditFile`, `scenario.createGuestViewFile`, `scenario.createPublishedFile`, `scenario.importFileFromUrl`, `scenario.downloadFileFromSidebar`, `scenario.setSharedLinkType`, `scenario.createWorkspaceWithMember`, and `scenario.createWorkspaceWithRemovedMember` for common setup.
- Use `scenario.createLegacyRouteFixture` for legacy `/r`, `/ro`, `/v`, `/s`, and history route setup. It creates namespaced debug-only worker data instead of relying on shared production-like fixtures.
- Use direct database setup only for preconditions that are expensive or impossible through the UI, such as enabling workspace flags. Keep the behavior under test in UI actions.
- Prefer live assertions across already-open windows. Reload-based checks are still useful for persistence, but they should not be the only proof for collaboration, permission, or membership behavior.
- Wait for readiness through actor helpers and page objects. `actor.goto` waits for the canvas, auth state, app store hydration when a signed-in app is present, mounted editor, file room connection, visitor access metadata, and pending app mutations. Use the narrower `actor.waitForAuthLoaded`, `actor.waitForAppStoreHydrated`, `actor.waitForEditorReady`, `actor.waitForFileRoomConnected`, `actor.waitForVisitorAccessMetadata`, `actor.waitForMutationResolution`, and `actor.waitForSessionClosed` helpers when a test needs to prove a specific transition. Avoid new sleeps unless the product intentionally waits.

## Auth follow-ups

The remaining auth edge cases are still tracked by issue #9185. Keep them out of the scenario project until they have Clerk-level mocking or stable account state that can run without per-test shared-user reset.

Follow-up migration groups:

- Auth legal acceptance and analytics consent: replace route-level Clerk response patching with a stable Clerk test account state or a mocked Clerk client boundary.
- Auth verification and resend behavior: isolate Clerk network failures, malformed responses, cooldown behavior, and code input behavior without depending on shared signed-in user cleanup.
- OAuth auth flows: add a Clerk/OAuth boundary that can exercise Google sign-in and legal acceptance without external redirects.
- Auth response edge cases: cover completed sessions, inconsistent `missing_fields` payloads, and missing email-code factor data once Clerk responses can be mocked below the route layer.
