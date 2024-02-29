import { Locator, Page } from '@playwright/test'

export class HelpMenu {
	readonly helpMenuButton: Locator
	readonly languagesButton: Locator
	readonly languagesContent: Locator
	readonly keyboardShortcutsMenu: KeyboardShortcutsMenu
	readonly linkGroup: { [key: string]: Locator }

	constructor(public readonly page: Page) {
		this.page = page
		this.helpMenuButton = this.page.getByTestId('help-menu.button')
		this.languagesButton = this.page.getByTestId('help-menu-sub.language-button')
		this.languagesContent = this.page.getByTestId('help-menu-sub.language-content')
		this.keyboardShortcutsMenu = new KeyboardShortcutsMenu(this.page)
		this.linkGroup = {
			github: this.page.getByTestId('help-menu.github'),
			twitter: this.page.getByTestId('help-menu.twitter'),
			discord: this.page.getByTestId('help-menu.discord'),
			about: this.page.getByTestId('help-menu.about'),
		}
	}
}
class KeyboardShortcutsMenu {
	readonly heading: Locator
	readonly button: Locator
	readonly closeButton: Locator

	constructor(private readonly page: Page) {
		this.heading = this.page.getByRole('dialog').getByText('Keyboard shortcuts')
		this.button = this.page.getByTestId('help-menu.keyboard-shortcuts-button')
		this.closeButton = this.page.getByRole('dialog').getByTestId('dialog.close')
	}
}
