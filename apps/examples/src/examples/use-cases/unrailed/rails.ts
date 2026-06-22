import { Editor, TLShapeId, b64Vecs, createShapeId } from 'tldraw'
import { START_LEN_TILES, TILE, TRACK_ROW } from './constants'

// The track is genuine canvas ink: the player's own draw strokes, validated and
// then locked + restyled to look like rails. A ties overlay (see TrackOverlay)
// adds the railroad read on top of whatever line they draw.

const TRACK_PROPS = {
	color: 'black',
	fill: 'none',
	dash: 'draw',
	size: 'm',
} as const

/** Lock a freshly-drawn stroke and restyle it as track. */
export function adoptAsTrack(editor: Editor, id: TLShapeId) {
	editor.updateShape({
		id,
		type: 'draw',
		isLocked: true,
		meta: { unrailed: 'rail' },
		props: TRACK_PROPS,
	})
}

/** Create the short straight starter track so the train has rails at t=0. */
export function createStarterTrack(editor: Editor) {
	const y = (TRACK_ROW + 0.5) * TILE
	editor.createShape({
		id: createShapeId('unrailed-starter-track'),
		type: 'draw',
		x: 0,
		y: 0,
		isLocked: true,
		meta: { unrailed: 'rail' },
		props: {
			...TRACK_PROPS,
			segments: [
				{
					type: 'straight',
					path: b64Vecs.encodePoints([
						{ x: 0, y, z: 0.5 },
						{ x: START_LEN_TILES * TILE, y, z: 0.5 },
					]),
				},
			],
			isComplete: true,
			isClosed: false,
			isPen: false,
		},
	})
}
