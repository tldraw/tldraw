import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { step } from './tla-test'

export class SignInDialog {
	public readonly googleButton: Locator
	public readonly emailInput: Locator
	public readonly continueWithEmailButton: Locator
	public readonly codeInput: Locator
	public readonly resendButton: Locator
	public readonly analyticsCheckbox: Locator
	public readonly acceptAndContinueButton: Locator

	constructor(private readonly page: Page) {
		this.googleButton = this.page.getByTestId('tla-google-sign-in-button')
		this.emailInput = this.page.getByLabel('Email address')
		this.continueWithEmailButton = this.page.getByTestId('tla-continue-with-email-button')
		this.codeInput = this.page.locator('#tla-verification-code')
		this.resendButton = this.page.getByTestId('tla-resend-code-button')
		this.analyticsCheckbox = this.page.getByRole('checkbox', {
			name: /Allow analytics to help improve tldraw/i,
		})
		this.acceptAndContinueButton = this.page.getByTestId('tla-accept-and-continue-button')
	}

	@step
	async expectInitialElements() {
		await expect(this.googleButton).toBeVisible()
		await expect(this.emailInput).toBeVisible()
		await expect(this.continueWithEmailButton).toBeVisible()
	}

	@step
	async continueWithEmail(email: string) {
		await this.emailInput.fill(email)
		await expect(this.continueWithEmailButton).toBeEnabled()
		await this.continueWithEmailButton.click()
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
	async expectTermsStageVisible() {
		await expect(this.acceptAndContinueButton).toBeVisible()
	}

	@step
	async expectAnalyticsToggleVisible() {
		await expect(this.analyticsCheckbox).toBeVisible()
	}

	@step
	async expectAnalyticsToggleHidden() {
		await expect(this.analyticsCheckbox).toHaveCount(0)
	}

	@step
	async expectAcceptAndContinueDisabled() {
		await expect(this.acceptAndContinueButton).toBeDisabled()
	}

	@step
	async setAnalyticsOptIn(optIn: boolean) {
		if ((await this.analyticsCheckbox.count()) === 0) return
		if (optIn) {
			await this.analyticsCheckbox.check()
		} else {
			await this.analyticsCheckbox.uncheck()
		}
	}

	@step
	async acceptAndContinue() {
		await this.acceptAndContinueButton.click()
	}
}
