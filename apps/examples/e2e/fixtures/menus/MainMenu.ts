import { Locator, Page } from '@playwright/test'

export class MainMenu {
	readonly mainMenuButton: Locator
	readonly buttons: { [key: string]: Locator }
	readonly subMenus: { [key: string]: Locator[] }
	constructor(public readonly page: Page) {
		this.page = page
		this.mainMenuButton = this.page.getByTestId('main-menu.button')
		this.buttons = {
			edit: this.page.getByRole('menuitem').getByText('Edit'),
			object: this.page.getByRole('menuitem').getByText('Object'),
			view: this.page.getByRole('menuitem').getByText('View'),
			insertEmbed: this.page.getByRole('menuitem').getByText('Insert Embed'),
			uploadMedia: this.page.getByRole('menuitem').getByText('Upload Media'),
			preferences: this.page.getByRole('menuitem').getByText('Preferences'),
		}
		this.subMenus = {
			editSubmenu: [
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Undo'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Redo'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Cut'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Copy'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Copy as'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Duplicate'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Paste'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Delete'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Select all'),
			],
			objectSubmenu: [
				this.page.getByRole('menuitem').getByText('Export as'),
				this.page.getByRole('menuitem').getByText('Group'),
				this.page.getByRole('menuitem').getByText('Ungroup'),
				this.page.getByRole('menuitem').getByText('Remove frame'),
				this.page.getByRole('menuitem').getByText('Fit to content'),
				this.page.getByRole('menuitem').getByText('Toggle auto size'),
				this.page.getByRole('menuitem').getByText('Edit link'),
				this.page.getByRole('menuitem').getByText('Convert to Bookmark'),
				this.page.getByRole('menuitem').getByText('Convert to Embed'),
				this.page.getByRole('menuitem').getByText('Toggle locked'),
				this.page.getByRole('menuitem').getByText('Unlock all'),
			],
			viewSubmenu: [
				this.page.getByTestId('main-menu-sub.view-content').getByText('Zoom in'),
				this.page.getByTestId('main-menu-sub.view-content').getByText('Zoom out'),
				this.page.getByTestId('main-menu-sub.view-content').getByText('Zoom to 100%'),
				this.page.getByTestId('main-menu-sub.view-content').getByText('Zoom to fit'),
				this.page.getByTestId('main-menu-sub.view-content').getByText('Zoom to selection'),
			],
			preferencesSubmenu: [
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Always snap'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Tool lock'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Show grid'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Dark mode'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Focus mode'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Edge scrolling'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Reduce motion'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Debug mode'),
				this.page.getByTestId('main-menu-sub.preferences-content').getByText('Language'),
			],
		}
	}
}
