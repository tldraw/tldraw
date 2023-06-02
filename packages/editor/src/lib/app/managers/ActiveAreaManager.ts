import { atom } from 'signia'
import { Editor } from '../Editor'

type Offsets = {
	top: number
	left: number
	bottom: number
	right: number
}
const DEFAULT_OFFSETS = {
	top: 10,
	left: 10,
	bottom: 10,
	right: 10,
}

export function getActiveAreaScreenSpace(app: Editor) {
	const containerEl = app.getContainer()
	const el = containerEl.querySelector('*[data-tldraw-area="active-drawing"]')
	const out = {
		...DEFAULT_OFFSETS,
		width: 0,
		height: 0,
	}
	if (el && containerEl) {
		const cBbbox = containerEl.getBoundingClientRect()
		const bbox = el.getBoundingClientRect()
		out.top = bbox.top
		out.left = bbox.left
		out.bottom = cBbbox.height - bbox.bottom
		out.right = cBbbox.width - bbox.right
	}

	out.width = app.viewportScreenBounds.width - out.left - out.right
	out.height = app.viewportScreenBounds.height - out.top - out.bottom
	return out
}

export function getActiveAreaPageSpace(app: Editor) {
	const out = getActiveAreaScreenSpace(app)
	const z = app.zoomLevel
	out.left /= z
	out.right /= z
	out.top /= z
	out.bottom /= z
	out.width /= z
	out.height /= z
	return out
}

export class ActiveAreaManager {
	constructor(public app: Editor) {
		window.addEventListener('resize', this.updateOffsets)
		this.app.disposables.add(this.dispose)
	}

	offsets = atom<Offsets>('activeAreaOffsets', DEFAULT_OFFSETS)

	updateOffsets = () => {
		const offsets = getActiveAreaPageSpace(this.app)
		this.offsets.set(offsets)
	}

	// Clear the listener
	dispose = () => {
		window.addEventListener('resize', this.updateOffsets)
	}
}
