import { ChangePageAction, createAgentActionInfo, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class ChangePageActionUtil extends AgentActionUtil<ChangePageAction> {
	static override type = 'change-page' as const

	override getInfo(action: Streaming<ChangePageAction>) {
		return createAgentActionInfo({
			icon: 'target',
			description: action.intent ?? `Changing to page: ${action.pageName}`,
			pose: 'working',
		})
	}

	override applyAction(action: Streaming<ChangePageAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		// Get all pages
		const pages = editor.getPages()

		// Find the page by name
		const targetPage = pages.find((page) => page.name === action.pageName)

		if (!targetPage) {
			// If page doesn't exist, schedule a message to let the user know
			this.agent.schedule({
				data: [
					`I couldn't find a page named "${action.pageName}". Available pages are: ${pages.map((p) => p.name).join(', ')}`,
				],
			})
			return
		}

		// Change to the page
		editor.setCurrentPage(targetPage.id)

		// Update the fairy's current page ID
		this.agent.updateEntity((f) => (f ? { ...f, currentPageId: targetPage.id } : f))

		// Move the fairy to the center of the viewport on the new page
		const center = editor.getViewportPageBounds().center
		this.agent.position.moveTo(center)
	}
}
