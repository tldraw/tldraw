import type { Page } from '@playwright/test'
import { USERS } from '../consts'
import { expect, test } from '../fixtures/tla-test'

// Don't use stored credentials for these dialog-specific tests
test.use({ storageState: { cookies: [], origins: [] } })

// Helper function to set up route mocking for sign-up with legal acceptance
async function setupSignUpWithLegalAcceptance(page: Page, sessionId: string) {
	let verificationIntercepted = false

	// Intercept and modify verification response to require legal acceptance (only once)
	await page.route('**/sign_ups/*/attempt*', async (route) => {
		if (verificationIntercepted) {
			await route.continue()
			return
		}

		verificationIntercepted = true
		const response = await route.fetch()
		const json = await response.json()

		// Modify response to require legal acceptance
		// Set at both top level and in response object to cover SDK variations
		json.missing_fields = ['legal_accepted']
		json.missingFields = ['legal_accepted']
		json.status = 'missing_requirements'

		if (json.response) {
			json.response.missing_fields = ['legal_accepted']
			json.response.status = 'missing_requirements'
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(json),
		})
	})

	// Intercept PATCH to complete after legal acceptance
	await page.route('**/sign_ups/**', async (route) => {
		const request = route.request()
		const method = request.method()
		const postData = request.postData() || ''

		if (method === 'PATCH' && postData.includes('legalAccepted')) {
			const response = await route.fetch()
			const json = await response.json()

			// Ensure status is complete and clear missing fields
			json.status = 'complete'
			json.createdSessionId = sessionId
			json.missing_fields = []
			json.missingFields = []

			if (json.response) {
				json.response.status = 'complete'
				json.response.created_session_id = sessionId
				json.response.missing_fields = []
			}

			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(json),
			})
			return
		}

		await route.fallback()
	})
}

test.describe('TlaSignInDialog', () => {
	test('renders initial elements and validates email input', async ({ homePage, signInDialog }) => {
		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.expectInitialElements()

		// Continue should be disabled until email entered
		await expect(signInDialog.continueWithEmailButton).toBeDisabled()
		await signInDialog.emailInput.fill('user@example.com')
		await expect(signInDialog.continueWithEmailButton).toBeEnabled()
	})

	test('can sign in via email code using the custom dialog', async ({
		homePage,
		editor,
		signInDialog,
	}) => {
		const user = USERS[test.info().parallelIndex]

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()

		await signInDialog.fillCode('424242')

		await editor.isLoaded()
		await expect(homePage.signInButton).not.toBeVisible()
		await expect(editor.sidebarToggle).toBeVisible()
	})

	test('resend is available on code stage', async ({ homePage, signInDialog }) => {
		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail('user@example.com')
		await signInDialog.expectCodeStageVisible()
		await signInDialog.clickResend()

		// Code input should still be visible and empty after resend
		await expect(signInDialog.codeInput).toBeVisible()
	})

	test('requires legal acceptance on sign-up before continuing', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		const uniqueEmail = `playwright-signup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

		await setupSignUpWithLegalAcceptance(page, 'session_mock_1')

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(uniqueEmail)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		await signInDialog.expectTermsStageVisible()
		await signInDialog.expectAnalyticsToggleVisible()
		await signInDialog.acceptAndContinue()
	})

	test('hides analytics toggle when consent already granted', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		const uniqueEmail = `playwright-analytics-hidden-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

		await setupSignUpWithLegalAcceptance(page, 'session_mock_analytics_hidden')

		await page.evaluate(
			([key, value]) => {
				window.localStorage.setItem(key, value)
			},
			['tldraw_cookie_consent', JSON.stringify({ analytics: true })]
		)

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(uniqueEmail)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		await signInDialog.expectTermsStageVisible()
		await signInDialog.expectAnalyticsToggleHidden()
		await signInDialog.acceptAndContinue()
	})

	test('opt-in analytics persists to localStorage on sign-up', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		const uniqueEmail = `playwright-analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

		await setupSignUpWithLegalAcceptance(page, 'session_mock_2')

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(uniqueEmail)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		await signInDialog.expectTermsStageVisible()
		await signInDialog.expectAnalyticsToggleVisible()
		await signInDialog.setAnalyticsOptIn(true)
		await signInDialog.acceptAndContinue()

		const storedConsent = await page.evaluate(() => {
			try {
				return (window as any)['localStorage'].getItem('tldraw_cookie_consent')
			} catch {
				return null
			}
		})

		expect(storedConsent).toBeTruthy()
		const parsed = storedConsent ? JSON.parse(storedConsent as string) : null
		expect(parsed?.analytics).toBe(true)
	})
})
