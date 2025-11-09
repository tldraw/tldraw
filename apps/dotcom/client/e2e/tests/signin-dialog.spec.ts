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

test.describe('SignInDialog', () => {
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
	test.skip('can close dialog during email entry stage', async () => {
		// Should test:
		// 1. Open sign in dialog
		// 2. Partially fill email or leave empty
		// 3. Click close button or press Escape
		// 4. Verify dialog closes and auth flow is cancelled
		// 5. Verify user remains signed out
	})

	test.skip('can close dialog during code entry stage', async () => {
		// Should test:
		// 1. Complete email stage and proceed to code entry
		// 2. Close dialog without entering code
		// 3. Verify dialog closes
		// 4. Verify partial auth attempt is abandoned
		// 5. Verify user can restart flow by reopening dialog
	})

	test.skip('can close dialog during terms acceptance stage', async () => {
		// Should test:
		// 1. Complete email and code stages for new user
		// 2. Reach terms acceptance screen
		// 3. Close dialog without accepting
		// 4. Verify dialog closes
		// 5. Verify user is not signed in
		// 6. Verify reopening dialog handles incomplete signup appropriately
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
