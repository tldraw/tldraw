import { StateNode, TLEventHandlers, Vec } from '@tldraw/editor'
import { Root, createRoot } from 'react-dom/client'
import { INITIAL_STICKER_SIZE } from '../StickerShapeUtil'
import StickerWheel from '../StickerWheel'
import { canonicalStickers, constructDataUriSticker } from '../stickers'

export class Idle extends StateNode {
	static override id = 'idle'
	stickerWheelDiv: HTMLDivElement | null = null
	root: Root | null = null
	cursorSize = INITIAL_STICKER_SIZE
	cursorSticker = 'heart'
	cursorRandomRotation = 0
	lastScreenPoint = new Vec(0, 0)
	lastWheelPoint = new Vec(0, 0)

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.parent.transition('pointing', info)
	}

	override onEnter = () => {
		this.cursorSize = INITIAL_STICKER_SIZE
		this.cursorRandomRotation = getRandomArbitrary(-16, 16)
		this.editor.setCursor({
			type: 'cross',
			customCanonicalSticker: this.cursorSticker,
			customUrl: constructDataUriSticker(
				this.cursorSticker as keyof typeof canonicalStickers,
				this.cursorSize,
				this.cursorRandomRotation
			),
			customSize: this.cursorSize,
			rotation: this.cursorRandomRotation,
		})

		this.stickerWheelDiv = document.createElement('div')
		this.stickerWheelDiv.id = 'tl-sticker-wheel-root'
		document.body.appendChild(this.stickerWheelDiv)
		this.root = createRoot(this.stickerWheelDiv)
		this.renderStickerWheel()
	}

	override onPointerMove = () => {
		this.renderStickerWheel()
	}

	renderStickerWheel = () => {
		const { currentScreenPoint } = this.editor.inputs
		const shouldMoveWheel =
			Vec.Dist(this.lastWheelPoint, currentScreenPoint) >
			Vec.Dist(this.lastWheelPoint, this.lastScreenPoint) + 4
		console.log(
			shouldMoveWheel,
			currentScreenPoint,
			this.lastScreenPoint,
			Vec.Dist(this.lastWheelPoint, currentScreenPoint),
			Vec.Dist(this.lastWheelPoint, this.lastScreenPoint)
		)
		let newWheelPoint = this.lastWheelPoint
		if (shouldMoveWheel) {
			newWheelPoint = Vec.Add(currentScreenPoint, new Vec(150, -150))
			this.lastWheelPoint = newWheelPoint
		}
		this.lastScreenPoint = currentScreenPoint.clone()

		const onStickerWheelSelect = (stickerKey: keyof typeof canonicalStickers) => {
			this.cursorSticker = stickerKey
			this.editor.setCursor({
				type: 'cross',
				customCanonicalSticker: stickerKey,
				customUrl: constructDataUriSticker(stickerKey, this.cursorSize, this.cursorRandomRotation),
				customSize: this.cursorSize,
				rotation: this.cursorRandomRotation,
			})
		}
		this.root?.render(<StickerWheel point={newWheelPoint} onSelect={onStickerWheelSelect} />)
	}

	override onExit = () => {
		this.root?.unmount()
		document.body.removeChild(this.stickerWheelDiv!)
	}

	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}

// TODO: put this in a math util file
function getRandomArbitrary(min: number, max: number) {
	return Math.random() * (max - min) + min
}
