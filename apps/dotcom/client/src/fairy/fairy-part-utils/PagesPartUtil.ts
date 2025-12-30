import { AgentRequest, PagesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class PagesPartUtil extends PromptPartUtil<PagesPart> {
	static override type = 'pages' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): PagesPart {
		const pages = this.agent.editor.getPages()
		const currentPageId = this.agent.editor.getCurrentPageId()
		const currentPage = this.agent.editor.getCurrentPage()

		return {
			type: 'pages',
			pages: pages.map((page) => ({
				id: page.id,
				name: page.name,
			})),
			currentPageId,
			currentPageName: currentPage.name,
		}
	}
}
