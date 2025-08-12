import { Editor, structuredClone } from 'tldraw'
import { TLAgentContent } from '../../types/TLAgentPrompt'

export function getWholePageContent({ editor }: { editor: Editor }): TLAgentContent {
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
