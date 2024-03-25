import { Editor, StateNode, TLEventHandlers, TLGeoShape, Vec, createShapeId } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	dropZoneShape = undefined as TLGeoShape | undefined

	override onPointerMove = () => {
		const dropZoneNotes = cusorInTheDropZone(this.editor)
		function cusorInTheDropZone(editor: Editor) {
			const closeNotesArr = editor
				.getCurrentPageShapes()
				.filter((s) => s.type === 'note')
				.filter((n) => {
					const dist = Vec.Dist({ x: n.x + 100, y: n.y + 100 }, editor.inputs.currentPagePoint)
					return (
						dist < 350 &&
						dist > 100 &&
						n.y < editor.inputs.currentPagePoint.y &&
						n.y > editor.inputs.currentPagePoint.y - 200
					)
				})
			return closeNotesArr
		}

		const firstNote = dropZoneNotes[0]
		if (!firstNote) {
			this.cleanupDropZone()
			return
		}

		if (!this.dropZoneShape) {
			const id = createShapeId()
			this.editor.createShape({
				type: 'geo',
				id,
				x: firstNote.x + 250,
				y: firstNote.y,
				opacity: 0.25,
				props: { h: 200, w: 200, color: 'light-blue', size: 's', dash: 'dotted', fill: 'solid' },
			})
			this.dropZoneShape = this.editor.getShape(id)
		}
	}

	cleanupDropZone() {
		if (this.dropZoneShape) {
			this.editor.deleteShape(this.dropZoneShape.id)
			this.dropZoneShape = undefined
		}
	}

	override onCancel = () => {
		this.cleanupDropZone()
		this.editor.setCurrentTool('select')
	}
}
