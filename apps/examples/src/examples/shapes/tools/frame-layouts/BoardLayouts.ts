import { TLShapeId } from 'tldraw'

// There's a guide at the bottom of this file!

export const BOARD_PADDING = 16
export const BOARD_GAP = 12
export const BOARD_HEADER_HEIGHT = 36

const EMPTY_WIDTH = 240
const EMPTY_HEIGHT = 168
const CARD_HEIGHT = 120
const CARD_WIDTH = 180
const HERO_HEIGHT = 240
const THUMBNAIL_HEIGHT = 80

export type BoardLayoutMode = 'free' | 'row' | 'column' | 'grid' | 'spotlight'

/** A child's box, relative to the board's content area. */
export interface LayoutBox {
	id: TLShapeId
	x: number
	y: number
	w: number
	h: number
}

export interface BoardLayout {
	label: string
	/** `null` arranges nothing, so the board behaves like a plain frame. */
	arrange: ((children: LayoutBox[]) => { boxes: LayoutBox[]; w: number; h: number }) | null
}

const midX = (box: LayoutBox) => box.x + box.w / 2
const midY = (box: LayoutBox) => box.y + box.h / 2

/** Scale a box to a target height or width, keeping its aspect ratio. */
const toHeight = (box: LayoutBox, h: number) => ({ ...box, w: (box.w / box.h) * h, h })
const toWidth = (box: LayoutBox, w: number) => ({ ...box, w, h: (box.h / box.w) * w })

// [1]
export const BOARD_LAYOUTS: Record<BoardLayoutMode, BoardLayout> = {
	free: {
		label: 'Free',
		arrange: null,
	},
	// [2]
	row: {
		label: 'Row',
		arrange(children) {
			let x = 0
			const boxes = [...children]
				.sort((a, b) => midX(a) - midX(b))
				.map((box) => {
					const next = { ...toHeight(box, CARD_HEIGHT), x, y: 0 }
					x += next.w + BOARD_GAP
					return next
				})
			return { boxes, w: x - BOARD_GAP, h: CARD_HEIGHT }
		},
	},
	column: {
		label: 'Column',
		arrange(children) {
			let y = 0
			const boxes = [...children]
				.sort((a, b) => midY(a) - midY(b))
				.map((box) => {
					const next = { ...toWidth(box, CARD_WIDTH), x: 0, y }
					y += next.h + BOARD_GAP
					return next
				})
			return { boxes, w: CARD_WIDTH, h: y - BOARD_GAP }
		},
	},
	grid: {
		label: 'Grid',
		arrange(children) {
			const cells = children.map((box) => toHeight(box, CARD_HEIGHT))
			const cellW = Math.max(...cells.map((box) => box.w))
			// Read the cards in rows: group them into horizontal bands, then left to right
			const band = (box: LayoutBox) => Math.round(midY(box) / (CARD_HEIGHT + BOARD_GAP))
			const sorted = cells.sort((a, b) => band(a) - band(b) || midX(a) - midX(b))
			const columns = Math.ceil(Math.sqrt(sorted.length))
			const rows = Math.ceil(sorted.length / columns)
			const boxes = sorted.map((box, i) => ({
				...box,
				x: (i % columns) * (cellW + BOARD_GAP) + (cellW - box.w) / 2,
				y: Math.floor(i / columns) * (CARD_HEIGHT + BOARD_GAP),
			}))
			return {
				boxes,
				w: columns * cellW + (columns - 1) * BOARD_GAP,
				h: rows * CARD_HEIGHT + (rows - 1) * BOARD_GAP,
			}
		},
	},
	spotlight: {
		label: 'Spotlight',
		arrange(children) {
			const [first, ...rest] = [...children].sort((a, b) => midX(a) - midX(b))
			const hero = toHeight(first, HERO_HEIGHT)
			const thumbnails = rest
				.sort((a, b) => midY(a) - midY(b))
				.map((box) => toHeight(box, THUMBNAIL_HEIGHT))

			const stackH =
				thumbnails.length * THUMBNAIL_HEIGHT + Math.max(0, thumbnails.length - 1) * BOARD_GAP
			const h = Math.max(HERO_HEIGHT, stackH)
			const stackW = Math.max(0, ...thumbnails.map((box) => box.w))

			let y = (h - stackH) / 2
			const boxes = [{ ...hero, x: 0, y: (h - HERO_HEIGHT) / 2 }]
			for (const thumbnail of thumbnails) {
				boxes.push({ ...thumbnail, x: hero.w + BOARD_GAP, y })
				y += thumbnail.h + BOARD_GAP
			}

			return { boxes, w: hero.w + (thumbnails.length ? BOARD_GAP + stackW : 0), h }
		},
	},
}

// [3]
export function arrangeBoard(mode: BoardLayoutMode, children: LayoutBox[]) {
	const { arrange } = BOARD_LAYOUTS[mode]
	if (!arrange) return null
	const { boxes, w, h } = children.length ? arrange(children) : { boxes: [], w: 0, h: 0 }
	return {
		boxes,
		w: Math.max(EMPTY_WIDTH, w + BOARD_PADDING * 2),
		h: Math.max(EMPTY_HEIGHT, h + BOARD_HEADER_HEIGHT + BOARD_PADDING * 2),
	}
}

/*
This file is the layout engine, and it never touches the editor. A layout takes the boxes of
a board's children and returns where they should go, which is why the same code arranges
video cards, note cards, or any other shape the board accepts.

[1]
Each mode is one entry in a record: a label plus a function from boxes to boxes. Adding a
mode (masonry, ring, timeline) means adding an entry here and a value to the board's `layout`
prop validator.

Every mode sorts the cards by their current position before assigning slots, so wherever you
drop a card is where it lands in the order. There's no separate index to keep in sync.

[2]
Because a layout returns whole boxes rather than points, it sizes its children as well as
placing them, and each mode decides what that means: a row gives every card the same height,
a column the same width, and spotlight scales the left-most card up to a hero and the rest
down to thumbnails. Drop a card to the left of the hero to promote it.

Sizes come from constants rather than from the cards, so switching modes lands on the same
result every time instead of compounding. The trade-off is that hand-resizing a card only
sticks on a `free` board, where nothing else owns its size.

[3]
Arrange the children and add the board's padding and header back, with a minimum size so an
empty board is still a usable drop target. Returns `null` for `free`, which arranges nothing.
*/
