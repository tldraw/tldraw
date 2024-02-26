import { Locator, Page } from '@playwright/test'

export class MainMenu {
	readonly mainMenuButton: Locator
	readonly buttons: { [key: string]: Locator }
	readonly subMenus: { [key: string]: Locator[] }
	constructor(public readonly page: Page) {
		this.page = page
		this.mainMenuButton = this.page.getByTestId('main-menu.button')
		this.buttons = {
			file: this.page.getByRole('menuitem').getByText('File'),
			edit: this.page.getByRole('menuitem').getByText('Edit'),
			view: this.page.getByRole('menuitem').getByText('View'),
			insertEmbed: this.page.getByRole('menuitem').getByText('Insert Embed'),
			uploadMedia: this.page.getByRole('menuitem').getByText('Upload Media'),
			preferences: this.page.getByRole('menuitem').getByText('Preferences'),
		}
		this.subMenus = {
			fileSubmenu: [
				this.page.getByRole('menuitem').getByText('Save a copy'),
				this.page.getByRole('menuitem').getByText('Open file'),
				this.page.getByRole('menuitem').getByText('New project'),
				this.page.getByRole('menuitem').getByText('Share this project'),
			],
			editSubmenu: [
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Undo'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Redo'),
				this.page.getByTestId('main-menu-sub.edit-content').getByText('Paste'),
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
