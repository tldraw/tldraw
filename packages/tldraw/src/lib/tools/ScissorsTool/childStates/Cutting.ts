import { atom, StateNode, TLShapeId, VecModel } from '@tldraw/editor'
import { cutShapesWithLasso } from '../cutShapesWithLasso'

export class Cutting extends StateNode {
	static override id = 'cutting'
	static override trackPerformance = true

	/** The lasso so far, in page space. Read by the scissors overlay. */
	points = atom<VecModel[]>('scissors lasso points', [])

	override onEnter() {
		const { x, y } = this.editor.inputs.getCurrentPagePoint()
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
		this.points.set([])
		this.parent.transition('idle')
		if (polygon.length < 3) return

		editor.markHistoryStoppingPoint('scissors cut')
		const { ids, pending } = cutShapesWithLasso(editor, polygon)

		const finish = (all: TLShapeId[]) => {
			if (editor.isDisposed || all.length === 0) return
			editor.setSelectedShapes(all)
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
