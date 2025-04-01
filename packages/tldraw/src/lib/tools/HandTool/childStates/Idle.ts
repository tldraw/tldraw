import { StateNode, TLKeyboardEventInfo, TLPointerEventInfo, Vec } from '@tldraw/editor'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		this.editor.setCursor({ type: 'grab', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		switch (info.code) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				this.nudgeCamera()
				return
			}
		}
	}

	override onKeyRepeat(info: TLKeyboardEventInfo) {
		switch (info.code) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				this.nudgeCamera()
				break
			}
		}
	}

	private nudgeCamera() {
		const {
			editor: {
				inputs: { keys },
			},
		} = this

		// The space key is used for panning the canvas by viewport size.
		if (keys.has('Space')) return

		// We want to use the "actual" shift key state,
		// not the one that's in the editor.inputs.shiftKey,
		// because that one uses a short timeout on release
		const shiftKey = keys.has('ShiftLeft')

		const delta = new Vec(0, 0)

		if (keys.has('ArrowLeft')) delta.x -= 1
		if (keys.has('ArrowRight')) delta.x += 1
		if (keys.has('ArrowUp')) delta.y -= 1
		if (keys.has('ArrowDown')) delta.y += 1

		if (delta.equals(new Vec(0, 0))) return

		const { gridSize } = this.editor.getDocumentSettings()

		const step = this.editor.getInstanceState().isGridMode
			? shiftKey
				? gridSize * GRID_INCREMENT
				: gridSize
			: shiftKey
				? MAJOR_NUDGE_FACTOR
				: MINOR_NUDGE_FACTOR

		const camera = this.editor.getCamera()
		const next = { x: camera.x + delta.x * step, y: camera.y + delta.y * step, z: camera.z }
		this.editor.setCamera(next, { immediate: true })
	}
}

export const MAJOR_NUDGE_FACTOR = 10
export const MINOR_NUDGE_FACTOR = 1
export const GRID_INCREMENT = 5
