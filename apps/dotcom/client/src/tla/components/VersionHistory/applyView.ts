import { Editor, TLCamera, TLPageId } from 'tldraw'

export interface HistoryView {
	pageId: TLPageId
	camera: TLCamera
}

export type ViewEditor = Pick<
	Editor,
	'getPage' | 'getPages' | 'setCurrentPage' | 'setCamera' | 'zoomToFit'
>

export function applyView(editor: ViewEditor, view: HistoryView | null) {
	if (view && editor.getPage(view.pageId)) {
		editor.setCurrentPage(view.pageId)
		editor.setCamera(view.camera)
		return
	}
	const first = editor.getPages()[0]
	if (first) editor.setCurrentPage(first.id)
	editor.zoomToFit()
}
