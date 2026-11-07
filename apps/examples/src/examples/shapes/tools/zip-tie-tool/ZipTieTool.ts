import { StateNode, TLPointerEventInfo, Vec, atom } from 'tldraw'
import { ZipTieHit, getZipTieHits, zipTieArrows } from './zip-tie-shared'

export class ZipTieTool extends StateNode {
	static override id = 'zip-tie'
	static override initial = 'idle'
	static override children() {
		return [IdleState, CuttingState]
	}

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}
}

class IdleState extends StateNode {
	static override id = 'idle'

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('cutting', info)
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

// [1]
export class CuttingState extends StateNode {
	static override id = 'cutting'

	line = atom<{ start: Vec; end: Vec } | null>('zip tie line', null)
	hits = atom<ZipTieHit[]>('zip tie hits', [])

	override onEnter() {
		const start = this.editor.inputs.getOriginPagePoint().clone()
		this.line.set({ start, end: start })
		this.hits.set([])
	}

	override onExit() {
		this.line.set(null)
		this.hits.set([])
		this.editor.setHintingShapes([])
	}

	override onPointerMove() {
		const line = this.line.get()
		if (!line) return
		const end = this.editor.inputs.getCurrentPagePoint().clone()
		this.line.set({ start: line.start, end })

		// [2]
		const hits = getZipTieHits(this.editor, line.start, end)
		this.hits.set(hits)
		this.editor.setHintingShapes(hits.map((hit) => hit.arrowId))
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.parent.transition('idle')
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	private complete() {
		const { editor } = this
		// Arrows can be deleted or locked by someone else while you're dragging.
		const hits = this.hits.get().filter(({ arrowId }) => {
			const arrow = editor.getShape(arrowId)
			return arrow && !arrow.isLocked
		})

		if (!hits.length) {
			this.parent.transition('idle')
			return
		}

		// [3]
		editor.markHistoryStoppingPoint('zip tie')
		zipTieArrows(editor, hits)
		editor.selectNone()

		if (editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			editor.setCurrentTool('select')
		}
	}
}

/*
[1]
`line` and `hits` are atoms so the overlay that draws the cut line re-renders as they change.

[2]
Hinting the crossed arrows shows what's about to be tied before you let go.

[3]
The stopping point makes the whole tie, shape and bindings, one undoable step.
*/
