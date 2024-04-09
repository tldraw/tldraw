import { Locator, Page } from '@playwright/test'

export class NavigationPanel {
	readonly minimap: Locator
	readonly zoomMenuButton: Locator
	readonly toggleButton: Locator
	readonly zoomMenuItems: { [key: string]: Locator }
	constructor(private readonly page: Page) {
		this.page = page
		this.minimap = page.getByLabel('minimap')
		this.zoomMenuButton = page.getByTestId('minimap.zoom-menu-button')
		this.toggleButton = page.getByTestId('minimap.toggle-button')
		this.zoomMenuItems = {
			zoomIn: page.getByRole('menuitem').getByText('Zoom in'),
			zoomOut: page.getByRole('menuitem').getByText('Zoom out'),
			zoomToHundred: page.getByRole('menuitem').getByText('Zoom to 100%'),
			zoomToFit: page.getByRole('menuitem').getByText('Zoom to fit'),
			zoomToSelection: page.getByRole('menuitem').getByText('Zoom to selection'),
		}
	}
}
