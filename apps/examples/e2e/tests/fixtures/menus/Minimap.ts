import { Locator, Page } from '@playwright/test'

export class Minimap {
	readonly button: Locator
	readonly items: { [key: string]: Locator }
	constructor(private readonly page: Page) {
		this.page = page
		this.button = page.getByTestId('minimap.zoom-menu-button')
		this.items = {
			zoomIn: page.getByRole('menuitem').getByText('Zoom in'),
			zoomOut: page.getByRole('menuitem').getByText('Zoom out'),
			zoomToHundred: page.getByRole('menuitem').getByText('Zoom to 100%'),
			zoomToFit: page.getByRole('menuitem').getByText('Zoom to fit'),
			zoomToSelection: page.getByRole('menuitem').getByText('Zoom to selection'),
		}
	}
}
