import { atom, StateNode, TLShapeId, VecModel } from '@tldraw/editor'
import { cutShapesWithLasso } from '../cutShapesWithLasso'

export class Cutting extends StateNode {
	static override id = 'cutting'
	static override trackPerformance = true

	/** The lasso so far, in page space. Read by the scissors overlay. */
	points = atom<VecModel[]>('scissors lasso points', [])

	override onEnter() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint().toFixed()
		this.points.set([{ x, y }])
	}

	override onPointerMove() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint().toFixed()
		this.points.set([...this.points.get(), { x, y }])
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.parent.transition('idle')
	}

	override onExit() {
		this.points.set([])
	}

	private complete() {
		const { editor } = this
		const polygon = this.points.get()
		this.parent.transition('idle')
		if (polygon.length < 3) return

		editor.markHistoryStoppingPoint('scissors cut')
		const pageId = editor.getCurrentPageId()
		const { ids, pending } = cutShapesWithLasso(editor, polygon)

		const finish = (all: TLShapeId[]) => {
			// Image cuts resolve later; by then the user may have moved on, so don't yank them back.
			if (editor.isDisposed || !editor.isIn('scissors') || editor.getCurrentPageId() !== pageId)
				return
			const taken = new Set(all.filter((id) => editor.getShape(id)))
			// A frame taken whole already carries its children; selecting both moves them twice.
			const selection = [...taken].filter(
				(id) => !editor.getShapeAncestors(id).some((ancestor) => taken.has(ancestor.id))
			)
			if (selection.length === 0) return
			editor.setSelectedShapes(selection)
			editor.setCurrentTool('select')
		}

		if (!pending) {
			finish(ids)
			return
		}
		// Image regions decode asynchronously, so the hand-off to the select tool waits for them.
		void pending.then((imageIds) => finish([...ids, ...imageIds]))
	}
}
