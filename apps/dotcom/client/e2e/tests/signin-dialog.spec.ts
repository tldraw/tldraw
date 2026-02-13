import type { Page } from '@playwright/test'
import { USERS } from '../consts'
import { expect, test } from '../fixtures/tla-test'

// Don't use stored credentials for these dialog-specific tests
test.use({ storageState: { cookies: [], origins: [] } })

// Helper function to set up route mocking for legal acceptance requirement
// Works with both sign-in and sign-up flows
async function setupLegalAcceptanceRequired(page: Page, sessionId: string) {
	let verificationIntercepted = false

	// Intercept verification attempts (both sign-in and sign-up)
	await page.route('**/sign_ins/*/attempt*', async (route) => {
		if (verificationIntercepted) {
			await route.continue()
			return
		}

		verificationIntercepted = true
		const response = await route.fetch()
		const json = await response.json()

		// Modify response to require legal acceptance
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

	await page.route('**/sign_ups/*/attempt*', async (route) => {
		if (verificationIntercepted) {
			await route.continue()
			return
		}

		verificationIntercepted = true
		const response = await route.fetch()
		const json = await response.json()

		// Modify response to require legal acceptance
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

	// Intercept updates to complete after legal acceptance
	await page.route('**/sign_ins/**', async (route) => {
		const request = route.request()
		const method = request.method()
		const postData = request.postData() || ''

		if (method === 'PATCH' && postData.includes('legalAccepted')) {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'complete',
					createdSessionId: sessionId,
					missing_fields: [],
					missingFields: [],
				}),
			})
			return
		}

		await route.fallback()
	})

	await page.route('**/sign_ups/**', async (route) => {
		const request = route.request()
		const method = request.method()
		const postData = request.postData() || ''

		if (method === 'PATCH' && postData.includes('legalAccepted')) {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'complete',
					createdSessionId: sessionId,
					missing_fields: [],
					missingFields: [],
				}),
			})
			return
		}

		await route.fallback()
	})
}

test.describe('SignInDialog', () => {
	test('renders initial elements and validates email input', async ({ homePage, signInDialog }) => {
		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.expectInitialElements()

		// Button is always enabled, but HTML5 validation prevents empty submission
		await expect(signInDialog.continueWithEmailButton).toBeEnabled()
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
		const user = USERS[test.info().parallelIndex]

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.clickResend()

		// Code input should still be visible and empty after resend
		await expect(signInDialog.codeInput).toBeVisible()
	})

	test.skip('requires legal acceptance before continuing', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		// TODO: This test requires Clerk API mocking to work properly
		// The setupLegalAcceptanceRequired function attempts to intercept Clerk API calls
		// to simulate a user who needs to accept legal terms, but the current implementation
		// doesn't properly handle the response format or the sign-in flow.
		//
		// To fix this test, we need to either:
		// 1. Set up a test user in the Clerk environment who actually needs to accept terms
		// 2. Improve the API mocking to handle both sign-in and sign-up flows correctly
		// 3. Mock at a different level (e.g., mock the entire Clerk client)
		const user = USERS[test.info().parallelIndex]

		await setupLegalAcceptanceRequired(page, 'session_mock_1')

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		await signInDialog.expectTermsStageVisible()
		await signInDialog.expectAnalyticsToggleVisible()
		await signInDialog.acceptAndContinue()
	})

	test.skip('hides analytics toggle when consent already granted', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		// TODO: See comment in 'requires legal acceptance before continuing' test
		// This test has the same Clerk API mocking issues
		const user = USERS[test.info().parallelIndex]

		await setupLegalAcceptanceRequired(page, 'session_mock_analytics_hidden')

		await page.evaluate(
			([key, value]) => {
				// eslint-disable-next-line no-restricted-syntax
				window.localStorage.setItem(key, value)
			},
			['tldraw_cookie_consent', JSON.stringify({ analytics: true })]
		)

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		await signInDialog.expectTermsStageVisible()
		await signInDialog.expectAnalyticsToggleHidden()
		await signInDialog.acceptAndContinue()
	})

	test.skip('opt-in analytics persists to localStorage', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		// TODO: See comment in 'requires legal acceptance before continuing' test
		// This test has the same Clerk API mocking issues
		const user = USERS[test.info().parallelIndex]

		await setupLegalAcceptanceRequired(page, 'session_mock_2')

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
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

	// Google OAuth flow
	test.skip('can sign in with Google OAuth', async () => {
		// Should test:
		// 1. Click "Sign in with Google" button
		// 2. Mock/handle OAuth redirect flow
		// 3. Verify successful authentication and redirect to editor
		// 4. Check that user is signed in (no sign in button visible)
		// Note: Requires OAuth flow mocking or test environment setup
	})

	test.skip('Google OAuth handles new user requiring legal acceptance', async () => {
		// Should test:
		// 1. Start Google OAuth for a new user account
		// 2. After OAuth completion, verify legal acceptance screen appears
		// 3. Verify analytics toggle is shown
		// 4. Accept terms and verify user is fully signed in
	})

	// Existing user sign-in flow
	test.skip('existing user can sign in without legal acceptance', async () => {
		// Should test:
		// 1. Enter email for an existing user who has already accepted terms
		// 2. Enter verification code
		// 3. Verify sign in completes without showing terms/analytics screen
		// 4. Verify user is taken directly to editor
	})

	// Error handling scenarios
	test.skip('displays error for invalid verification code', async () => {
		// Should test:
		// 1. Enter valid email and proceed to code stage
		// 2. Enter incorrect verification code
		// 3. Verify error message is displayed
		// 4. Verify code input is cleared and can be retried
	})

	test.skip('handles API errors during email submission', async () => {
		// Should test:
		// 1. Mock API to return error during sign in attempt
		// 2. Submit email address
		// 3. Verify error message is displayed to user
		// 4. Verify form remains usable for retry
	})

	test.skip('handles network failure during code verification', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Mock network failure for verification attempt
		// 3. Submit verification code
		// 4. Verify error is displayed and user can retry
	})

	test.skip('handles error during terms acceptance', async () => {
		// Should test:
		// 1. Complete email and code steps for new user
		// 2. Mock API error when submitting legal acceptance
		// 3. Click "Accept and continue"
		// 4. Verify error message is displayed
		// 5. Verify user can retry acceptance
	})

	test.skip('displays resend error when resend API fails', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Mock resend API to return error
		// 3. Click resend button
		// 4. Verify resend error message is displayed
	})

	// Resend cooldown behavior
	test.skip('enforces 30-second cooldown on resend button', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Click resend button
		// 3. Verify button is disabled with countdown timer (30, 29, 28...)
		// 4. Wait for cooldown to expire
		// 5. Verify button becomes enabled again after 30 seconds
	})

	test.skip('cannot resend code while previous resend is in progress', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Click resend and immediately try to click again
		// 3. Verify button is disabled during submission
		// 4. Verify only one resend request is sent
	})

	// Code input UX
	test.skip('auto-submits code when 6 digits are entered', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Type 6 digits in code input
		// 3. Verify code is automatically submitted without clicking a button
		// 4. Verify verification API call is made automatically
	})

	test.skip('code input only accepts numeric characters', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Try typing letters and special characters in code input
		// 3. Verify only numeric characters 0-9 are accepted
		// 4. Verify input is limited to 6 characters maximum
	})

	test.skip('code input shows visual focus state on OTP boxes', async () => {
		// Should test:
		// 1. Enter email and proceed to code stage
		// 2. Focus on code input
		// 3. Verify correct OTP box shows focus state as digits are entered
		// 4. Verify focus indicator moves as each digit is typed
	})

	// Analytics opt-out
	test.skip('can opt out of analytics on sign-up', async () => {
		// Should test:
		// 1. Complete sign-up flow to terms stage
		// 2. Verify analytics toggle is initially unchecked or check state
		// 3. Explicitly uncheck analytics toggle (if checked)
		// 4. Accept terms and continue
		// 5. Verify localStorage shows analytics: false
	})

	test.skip('analytics preference defaults to null for first-time users', async () => {
		// Should test:
		// 1. Clear localStorage
		// 2. Start sign-up flow
		// 3. Reach terms stage
		// 4. Verify analytics toggle state reflects null initial state
		// 5. Accept without changing toggle
		// 6. Verify final localStorage state
	})

	// Dialog close behaviors
	test('can close dialog during email entry stage', async ({ homePage, signInDialog, page }) => {
		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.expectInitialElements()

		// Partially fill email
		await signInDialog.emailInput.fill('partial@example.com')

		// Close the dialog
		await page.keyboard.press('Escape')

		// Verify dialog is closed and user remains signed out
		await expect(signInDialog.emailInput).not.toBeVisible()
		await homePage.expectSignInButtonVisible()
	})

	test('can close dialog during code entry stage', async ({ homePage, signInDialog, page }) => {
		const user = USERS[test.info().parallelIndex]

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		// Complete email stage
		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()

		// Close dialog without entering code
		await page.keyboard.press('Escape')

		// Verify dialog is closed and user remains signed out
		await expect(signInDialog.codeInput).not.toBeVisible()
		await homePage.expectSignInButtonVisible()

		// Verify user can restart flow by reopening dialog
		await homePage.signInButton.click()
		await signInDialog.expectInitialElements()
	})

	test.skip('can close dialog during terms acceptance stage', async ({
		homePage,
		signInDialog,
		page,
	}) => {
		// TODO: See comment in 'requires legal acceptance before continuing' test
		// This test has the same Clerk API mocking issues
		const user = USERS[test.info().parallelIndex]

		await setupLegalAcceptanceRequired(page, 'session_mock_close')

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		// Complete email and code stages
		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		// Reach terms acceptance screen
		await signInDialog.expectTermsStageVisible()

		// Close dialog without accepting
		await page.keyboard.press('Escape')

		// Verify dialog is closed and user is not signed in
		await expect(signInDialog.acceptAndContinueButton).not.toBeVisible()
		await homePage.expectSignInButtonVisible()

		// Verify reopening dialog starts fresh (user can restart flow)
		await homePage.signInButton.click()
		await signInDialog.expectInitialElements()
	})

	// Edge cases
	test.skip('prevents submission of empty or whitespace-only email', async () => {
		// Should test:
		// 1. Open sign in dialog
		// 2. Try to submit with empty email
		// 3. Verify continue button is disabled
		// 4. Try to submit with whitespace only
		// 5. Verify submission is prevented via HTML5 validation or button state
	})

	test.skip('handles session already complete on verification', async () => {
		// Should test:
		// 1. Start sign-in flow
		// 2. Mock API to return status: 'complete' immediately on code entry
		// 3. Enter code
		// 4. Verify user is signed in without showing additional screens
		// 5. Verify dialog closes and editor is accessible
	})

	test.skip('recovers from Clerk API inconsistencies', async () => {
		// Should test:
		// 1. Mock Clerk API returning inconsistent response formats
		// 2. Test handling of both missing_fields and missingFields variations
		// 3. Verify sign-up flow completes despite API format variations
	})

	test.skip('handles missing emailAddressId in sign-in response', async () => {
		// Should test:
		// 1. Mock sign-in response without emailAddressId for email_code factor
		// 2. Submit email for existing user
		// 3. Verify error message about email verification not being available
		// 4. Verify user can retry or try different email
	})
})
