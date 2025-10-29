import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { step } from './tla-test'

export class TlaSignInDialog {
	public readonly googleButton: Locator
	public readonly emailInput: Locator
	public readonly continueButton: Locator
	public readonly codeInput: Locator
	public readonly resendButton: Locator
	public readonly termsCheckbox: Locator
	public readonly analyticsCheckbox: Locator
	public readonly continueToTldrawButton: Locator

	constructor(private readonly page: Page) {
		this.googleButton = this.page.getByRole('button', { name: 'Continue with Google' })
		this.emailInput = this.page.getByLabel('Email address')
		this.continueButton = this.page.getByRole('button', { name: 'Continue', exact: true })
		this.codeInput = this.page.locator('#tla-verification-code')
		this.resendButton = this.page.getByRole('button', { name: 'Resend' })
		this.termsCheckbox = this.page.getByRole('checkbox', {
			name: 'I agree to the Terms of Service and Privacy Policy',
		})
		this.analyticsCheckbox = this.page.getByRole('checkbox', {
			name: /Allow analytics to help improve tldraw/i,
		})
		this.continueToTldrawButton = this.page.getByRole('button', {
			name: 'Continue to tldraw',
		})
	}

	@step
	async expectInitialElements() {
		await expect(this.googleButton).toBeVisible()
		await expect(this.emailInput).toBeVisible()
		await expect(this.continueButton).toBeVisible()
	}

	@step
	async continueWithEmail(email: string) {
		await this.emailInput.fill(email)
		await expect(this.continueButton).toBeEnabled()
		await this.continueButton.click()
	}

	@step
	async expectCodeStageVisible() {
		await expect(this.codeInput).toBeVisible()
	}

	@step
	async fillCode(code: string) {
		await this.codeInput.fill(code)
	}

	@step
	async clickResend() {
		await expect(this.resendButton).toBeVisible()
		await this.resendButton.click()
	}

	@step
	async submitCode() {
		await expect(this.continueButton).toBeEnabled()
		await this.continueButton.click()
	}

	@step
	async expectTermsStageVisible() {
		await expect(this.termsCheckbox).toBeVisible()
		await expect(this.analyticsCheckbox).toBeVisible()
		await expect(this.continueToTldrawButton).toBeVisible()
	}

	@step
	async expectContinueToTldrawDisabled() {
		await expect(this.continueToTldrawButton).toBeDisabled()
	}

	@step
	async acceptTerms() {
		await this.termsCheckbox.check()
	}

	@step
	async setAnalyticsOptIn(optIn: boolean) {
		if (optIn) {
			await this.analyticsCheckbox.check()
		} else {
			await this.analyticsCheckbox.uncheck()
		}
	}

	@step
	async continueToTldraw() {
		await this.continueToTldrawButton.click()
	}
}
