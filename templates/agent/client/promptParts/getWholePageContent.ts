import { Editor, structuredClone } from 'tldraw'
import { AgentContent } from '../types/AgentPrompt'

export function getWholePageContent({ editor }: { editor: Editor }): AgentContent {
	const contentFromCurrentPage = editor.getContentFromCurrentPage(
		editor.getCurrentPageShapesSorted()
	)

	if (contentFromCurrentPage) {
		return {
			shapes: structuredClone(contentFromCurrentPage.shapes),
			bindings: structuredClone(contentFromCurrentPage.bindings ?? []),
		}
	}

	return {
		shapes: [],
		bindings: [],
	}
}
