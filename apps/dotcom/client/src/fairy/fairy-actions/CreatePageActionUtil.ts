import { createAgentActionInfo, CreatePageAction, Streaming } from '@tldraw/fairy-shared'
import { PageRecordType } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class CreatePageActionUtil extends AgentActionUtil<CreatePageAction> {
	static override type = 'create-page' as const

	override getInfo(action: Streaming<CreatePageAction>) {
		return createAgentActionInfo({
			icon: 'note',
			description: action.intent ?? `Creating page: ${action.pageName}`,
			pose: 'working',
		})
	}

	override applyAction(action: Streaming<CreatePageAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

		// Check if we're in readonly mode
		if (editor.getIsReadonly()) {
			this.agent.schedule({
				data: ['I cannot create pages in readonly mode.'],
			})
			return
		}

		// Check if we've reached the max pages limit
		const pages = editor.getPages()
		if (pages.length >= editor.options.maxPages) {
			this.agent.schedule({
				data: [
					`I cannot create more pages. The maximum number of pages (${editor.options.maxPages}) has been reached.`,
				],
			})
			return
		}

		// Check if a page with this name already exists
		const existingPage = pages.find((page) => page.name === action.pageName)
		if (existingPage) {
			this.agent.schedule({
				data: [`A page named "${action.pageName}" already exists.`],
			})
			return
		}

		// Create the new page
		editor.run(() => {
			editor.markHistoryStoppingPoint('creating page')
			const newPageId = PageRecordType.createId()
			editor.createPage({ name: action.pageName, id: newPageId })

			// If switchToPage is true, navigate to the new page
			if (action.switchToPage) {
				editor.setCurrentPage(newPageId)

				// Update the fairy's current page ID
				this.agent.updateEntity((f) => (f ? { ...f, currentPageId: newPageId } : f))

				// Move the fairy to the center of the viewport on the new page
				const center = editor.getViewportPageBounds().center
				this.agent.position.moveTo(center)
			}
		})
	}
}
