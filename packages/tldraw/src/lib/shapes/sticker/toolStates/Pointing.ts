import {
	StateNode,
	TLEventHandlers,
	TLInterruptEvent,
	TLPointerEventInfo,
	TLStickerShape,
	createShapeId,
	degreesToRadians,
	throttle,
} from '@tldraw/editor'
import { INITIAL_STICKER_SIZE } from '../StickerShapeUtil'
import { canonicalStickers, constructSvgSticker } from '../stickers'

export class Pointing extends StateNode {
	static override id = 'pointing'

	dragged = false

	info = {} as TLPointerEventInfo

	markId = ''

	shape = {} as TLStickerShape

	cursorTimer = new Date()
	cursorSize = INITIAL_STICKER_SIZE
	cursorSticker = 'heart'
	cursorRandomRotation = 0
	updateCursorThrottled: () => void = () => {}

	override onEnter = () => {
		this.cursorTimer = new Date()
		this.cursorSize = INITIAL_STICKER_SIZE
		this.cursorSticker = this.editor.getInstanceState().cursor.customCanonicalSticker || 'heart'
		this.cursorRandomRotation = this.editor.getInstanceState().cursor.rotation
		this.updateCursorThrottled = throttle(() => this.updateCursor(), 33)
	}

	override onTick = () => {
		this.updateCursorThrottled()
	}

	updateCursor() {
		const time = new Date().getTime() - this.cursorTimer.getTime()
		let newCursorSize = INITIAL_STICKER_SIZE
		if (time < 1000) {
			newCursorSize = INITIAL_STICKER_SIZE
		} else if (time < 2000) {
			newCursorSize = 64
		} else if (time < 3000) {
			newCursorSize = 96
		} else {
			newCursorSize = 128
		}
		if (newCursorSize !== this.cursorSize) {
			this.cursorRandomRotation = getRandomArbitrary(-16, 16)
			this.cursorSize = newCursorSize
		}

		this.editor.setCursor({
			type: 'cross',
			customUrl: `data:image/svg+xml;base64,${btoa(constructSvgSticker(this.cursorSticker as keyof typeof canonicalStickers, newCursorSize, getRandomArbitrary(this.cursorRandomRotation - 6, this.cursorRandomRotation + 6)))}`,
			customSize: newCursorSize,
			rotation: 0,
		})
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.shape = this.createShape()
		this.complete()
	}

	override onInterrupt: TLInterruptEvent = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private complete() {
		this.parent.transition('idle')
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}

	private createShape() {
		const {
			inputs: { currentPagePoint },
		} = this.editor

		const id = createShapeId()
		this.markId = `creating:${id}`
		this.editor.mark(this.markId)

		this.editor
			.createShapes([
				{
					id,
					type: 'sticker',
					x: currentPagePoint.x - this.cursorSize / 2,
					y: currentPagePoint.y - this.cursorSize / 2,
					props: {
						kind: 'canonical',
						sticker: this.cursorSticker,
						url: '',
						w: this.cursorSize,
						h: this.cursorSize,
					},
					// TODO: yeah i know - this is a hack for now
					rotation: degreesToRadians(this.cursorRandomRotation),
				},
			])
			.select(id)

		return this.editor.getShape<TLStickerShape>(id)!
	}
}

// TODO: put this in a math util file
function getRandomArbitrary(min: number, max: number) {
	return Math.random() * (max - min) + min
}
