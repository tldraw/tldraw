import type { Locator, Page } from '@playwright/test'
import { step } from './tla-test'

type ShareMenuTab = 'invite' | 'export' | 'publish'

export class ShareMenu {
	public readonly shareButton: Locator

	public readonly exportTabButton: Locator
	public readonly inviteTabButton: Locator
	public readonly publishTabButton: Locator
	public readonly anonShareTabButton: Locator

	public readonly exportTabPage: Locator
	public readonly inviteTabPage: Locator
	public readonly publishTabPage: Locator
	public readonly anonShareTabPage: Locator

	public readonly publishChangesButton: Locator

	public readonly copyLinkButton: Locator
	public readonly exportImageButton: Locator
	public readonly tabs: { anonShare: Locator; invite: Locator; export: Locator; publish: Locator }

	constructor(public readonly page: Page) {
		this.shareButton = this.page.getByTestId('tla-share-button')
		this.exportTabButton = this.page.getByTestId('tla-share-tab-button-export')
		this.inviteTabButton = this.page.getByTestId('tla-share-tab-button-share')
		this.publishTabButton = this.page.getByTestId('tla-share-tab-button-publish')
		this.anonShareTabButton = this.page.getByTestId('tla-share-tab-button-anon-share')

		this.exportTabPage = this.page.getByTestId('tla-share-tab-page-export')
		this.inviteTabPage = this.page.getByTestId('tla-share-tab-page-share')
		this.publishTabPage = this.page.getByTestId('tla-share-tab-page-publish')
		this.anonShareTabPage = this.page.getByTestId('tla-share-tab-page-anon-share')

		this.publishChangesButton = this.page.getByRole('button', {
			name: 'Publish changes',
			exact: true,
		})
		this.copyLinkButton = this.page.getByRole('button', { name: 'Copy link' })
		this.exportImageButton = this.page.getByRole('button', { name: 'Export image' })
		this.tabs = {
			anonShare: this.anonShareTabButton,
			invite: this.inviteTabButton,
			export: this.exportTabButton,
			publish: this.publishTabButton,
		}
		this.shareFile = this.shareFile.bind(this)
		this.unshareFile = this.unshareFile.bind(this)
		this.publishFile = this.publishFile.bind(this)
		this.unpublishFile = this.unpublishFile.bind(this)
	}

	async open() {
		await this.shareButton.click()
	}

	async isInviteButtonVisible() {
		return await this.inviteTabButton.isVisible()
	}

	async share(tab: ShareMenuTab) {
		await this.ensureTabSelected(tab)
		if (!(await this.isToggleChecked())) {
			await this.page.getByRole('switch').check()
		}
	}

	async unshare(tab: ShareMenuTab) {
		await this.ensureTabSelected(tab)
		if (await this.isToggleChecked()) {
			await this.page.getByRole('switch').uncheck()
		}
	}

	@step
	async shareFile() {
		await this.share('invite')
	}

	@step
	async unshareFile() {
		await this.unshare('invite')
	}

	@step
	async publishFile() {
		await this.share('publish')
	}

	@step
	async unpublishFile() {
		await this.unshare('publish')
	}

	async isToggleChecked() {
		return await this.page.getByRole('switch').isChecked()
	}

	@step
	async copyLink() {
		await this.copyLinkButton.click()

		const handle = await this.page.evaluateHandle(async () => await navigator.clipboard.readText())
		return await handle.jsonValue()
	}

	@step
	async openShareMenuAndCopyInviteLink() {
		await this.open()
		await this.inviteTabButton.click()
		await this.ensureTabSelected('invite')
		return await this.copyLink()
	}

	@step
	async openShareMenuAndCopyPublishedLink() {
		await this.open()
		await this.publishTabButton.click()
		await this.ensureTabSelected('publish')
		return await this.copyLink()
	}

	@step
	async exportFile() {
		await this.ensureTabSelected('export')
		await this.exportImageButton.click()
	}

	@step
	async isTabSelected(tab: ShareMenuTab) {
		const attr = await this.tabs[tab].getAttribute('data-active')
		return attr === 'true'
	}

	@step
	async ensureTabSelected(tab: ShareMenuTab) {
		if (await this.isTabSelected(tab)) return
		const locator = this.tabs[tab]
		await locator.click()
	}

	@step
	async publishChanges() {
		await this.ensureTabSelected('publish')
		await this.publishChangesButton.click()
	}

	async getShareType() {
		return (await this.page.waitForSelector('[data-testid="shared-link-type-select"]'))
			.textContent()
			.then((text) => text?.trim())
	}
}
