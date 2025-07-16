import { TLAiStreamingChange } from '@tldraw/ai'
import { Editor, TLShape, TLShapePartial } from 'tldraw'

export function unapplyChanges({
	changes,
	editor,
}: {
	changes: (TLAiStreamingChange & { shape?: Partial<TLShape>; previousShape?: Partial<TLShape> })[]
	editor: Editor
}) {
	for (const change of changes) {
		unapplyChange({ change, editor })
	}
}

export function unapplyChange({
	change,
	editor,
}: {
	change: TLAiStreamingChange & { shape?: Partial<TLShape>; previousShape?: Partial<TLShape> }
	editor: Editor
}) {
	if (!change.complete) return

	switch (change.type) {
		case 'createShape': {
			editor.deleteShape(change.shape.id)
			break
		}
		case 'deleteShape': {
			if (!change.shape) return
			editor.createShape(change.shape as TLShapePartial)
			break
		}
		case 'updateShape': {
			if (!change.previousShape) return
			editor.updateShape(change.previousShape as TLShapePartial)
			break
		}
		case 'createBinding':
		case 'deleteBinding':
		case 'updateBinding': {
			alert('TODO: rejecting binding changes is not supported yet')
			break
		}
	}
}
