import { Locator, Page } from '@playwright/test'

export class ActionsMenu {
	readonly quickActions: { [key: string]: Locator }
	readonly mainActions: { [key: string]: Locator }
	readonly actionsMenuButton: Locator
	readonly actionsMenuContent: Locator

	constructor(public readonly page: Page) {
		this.page = page
		this.actionsMenuButton = this.page.getByTestId('actions-menu.button')
		this.actionsMenuContent = this.page.getByTestId('actions-menu.content')
		this.quickActions = {
			undo: this.page.getByTestId('quick-actions.undo'),
			redo: this.page.getByTestId('quick-actions.redo'),
			delete: this.page.getByTestId('quick-actions.delete'),
			duplicate: this.page.getByTestId('quick-actions.duplicate'),
		}
		this.mainActions = {
			alignLeft: this.page.getByTestId('actions-menu.align-left'),
			alignCenterHorizontal: this.page.getByTestId('actions-menu.align-center-horizontal'),
			alignRight: this.page.getByTestId('actions-menu.align-right'),
			stretchHorizontal: this.page.getByTestId('actions-menu.stretch-horizontal'),
			alignTop: this.page.getByTestId('actions-menu.align-top'),
			alignCenterVertical: this.page.getByTestId('actions-menu.align-center-vertical'),
			alignBottom: this.page.getByTestId('actions-menu.align-bottom'),
			stretchVertical: this.page.getByTestId('actions-menu.stretch-vertical'),
			distributeHorizontal: this.page.getByTestId('actions-menu.distribute-horizontal'),
			distributeVertical: this.page.getByTestId('actions-menu.distribute-vertical'),
			stackHorizontal: this.page.getByTestId('actions-menu.stack-horizontal'),
			stackVertical: this.page.getByTestId('actions-menu.stack-vertical'),
			sendToBack: this.page.getByTestId('actions-menu.send-to-back'),
			sendBackward: this.page.getByTestId('actions-menu.send-backward'),
			bringForward: this.page.getByTestId('actions-menu.bring-forward'),
			bringToFront: this.page.getByTestId('actions-menu.bring-to-front'),
			rotateCCW: this.page.getByTestId('actions-menu.rotate-ccw'),
			rotateCW: this.page.getByTestId('actions-menu.rotate-cw'),
			editLink: this.page.getByTestId('actions-menu.edit-link'),
			group: this.page.getByTestId('actions-menu.group'),
		}
	}
}
