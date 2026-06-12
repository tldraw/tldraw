import { expect, test } from '../fixtures/scenario-test'

// Signed-out workspace invite sign-in dialog UX. The signed-in accept path
// lives in sharing-live.scenario.spec.ts; the sign-in-through-the-dialog flow
// lives in the legacy smoke suite, which can still drive a live Clerk sign-in.
test.describe.configure({ mode: 'parallel' })

test.describe('invite sign-in scenarios', () => {
	test('signed-out invite link shows the sign-in dialog over the anonymous editor', async ({
		owner,
		member,
		visitor,
		scenario,
	}) => {
		const { workspaceName, inviteUrl } = await scenario.createPendingWorkspaceInvite({
			owner,
			member,
			workspaceName: scenario.name('invite sign-in workspace'),
			fileName: scenario.name('invite sign-in file'),
		})

		// The invite route resolves to the root: the anonymous editor renders
		// behind the sign-in dialog, which names the invited workspace, and the
		// ?invite marker is stripped from the URL once the dialog is up.
		await visitor.page.goto(inviteUrl)
		await visitor.page.waitForURL('http://localhost:3000/')
		await expect(visitor.signInDialog.googleButton).toBeVisible()
		await expect(visitor.page.locator('strong', { hasText: workspaceName })).toBeVisible()
		await expect(visitor.homePage.tldrawCanvas).toBeVisible()

		// Dismissing the dialog leaves the visitor on the usable anonymous editor.
		await visitor.page.keyboard.press('Escape')
		await expect(visitor.signInDialog.googleButton).not.toBeVisible()
		await expect(visitor.homePage.signInButton).toBeVisible()

		// A plain reload must not re-show the dialog. The invite token deliberately
		// lingers in session storage (so a later sign-in still completes the join),
		// but only an arrival from the invite route may open the dialog. Waiting for
		// app readiness lets the handler effect run, so the absence is meaningful.
		await visitor.page.reload()
		await visitor.waitForAppReady()
		await expect(visitor.signInDialog.googleButton).not.toBeVisible()

		// Opening the same invite link again is a fresh arrival, so the dialog
		// shows again.
		await visitor.page.goto(inviteUrl)
		await expect(visitor.signInDialog.googleButton).toBeVisible()
		await expect(visitor.page.locator('strong', { hasText: workspaceName })).toBeVisible()
	})
})
