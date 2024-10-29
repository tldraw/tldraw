import type { Locator, Page } from '@playwright/test'

type ShareMenuTab = 'invite' | 'publish'

export class ShareMenu {
	public readonly shareButton: Locator
	public readonly inviteButton: Locator
	public readonly publishButton: Locator
	public readonly publishChangesButton: Locator
	public readonly copyLinkButton: Locator
	public readonly tabs: { invite: Locator; publish: Locator }

	constructor(public readonly page: Page) {
		this.shareButton = this.page.getByRole('button', { name: 'Share' })
		this.inviteButton = this.page.getByRole('button', { name: 'Invite' })
		this.publishButton = this.page.getByRole('button', { name: 'Publish', exact: true })
		this.publishChangesButton = this.page.getByRole('button', {
			name: 'Publish changes',
			exact: true,
		})
		this.copyLinkButton = this.page.getByRole('button', { name: 'Copy link' })
		this.tabs = {
			invite: this.inviteButton,
			publish: this.publishButton,
		}
		this.shareFile = this.shareFile.bind(this)
		this.unshareFile = this.unshareFile.bind(this)
		this.publishFile = this.publishFile.bind(this)
		this.unpublishFile = this.unpublishFile.bind(this)
	}

	async open() {
		await this.shareButton.click()
	}

	async isVisible() {
		return this.inviteButton.isVisible()
	}

	async share(tab: ShareMenuTab) {
		await this.ensureTabSelected(tab)
		if (!(await this.isToggleChecked())) {
			await this.page.getByRole('checkbox').check()
		}
	}

	async unshare(tab: ShareMenuTab) {
		await this.ensureTabSelected(tab)
		if (await this.isToggleChecked()) {
			await this.page.getByRole('checkbox').uncheck()
		}
	}

	async shareFile() {
		await this.share('invite')
	}

	async unshareFile() {
		await this.unshare('invite')
	}

	async publishFile() {
		await this.share('publish')
	}

	async unpublishFile() {
		await this.unshare('publish')
	}

	async isToggleChecked() {
		return await this.page.getByRole('checkbox').isChecked()
	}

	async copyLink() {
		await this.copyLinkButton.click()
	}

	async isTabSelected(tab: ShareMenuTab) {
		const attr = await this.tabs[tab].getAttribute('data-active')
		return attr === 'true'
	}

	async ensureTabSelected(tab: ShareMenuTab) {
		if (await this.isTabSelected(tab)) return
		const locator = this.tabs[tab]
		await locator.click()
	}

	async updateChanges() {
		await this.ensureTabSelected('publish')
		await this.publishChangesButton.click()
	}
}
