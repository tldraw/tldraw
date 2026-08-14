import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape } from 'tldraw'

// There's a guide at the bottom of this file!

export const VIDEO_CARD_SHAPE_TYPE = 'video-card'
export const NOTE_CARD_SHAPE_TYPE = 'media-note-card'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[VIDEO_CARD_SHAPE_TYPE]: { w: number; h: number; url: string }
		[NOTE_CARD_SHAPE_TYPE]: { w: number; h: number; text: string; color: string }
	}
}

export type VideoCardShape = TLShape<typeof VIDEO_CARD_SHAPE_TYPE>
export type NoteCardShape = TLShape<typeof NOTE_CARD_SHAPE_TYPE>

// [1]
export class VideoCardShapeUtil extends BaseBoxShapeUtil<VideoCardShape> {
	static override type = VIDEO_CARD_SHAPE_TYPE
	static override props: RecordProps<VideoCardShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		url: T.string,
	}

	override getDefaultProps(): VideoCardShape['props'] {
		return { w: 192, h: 108, url: '/fluid.mp4' }
	}

	// [2]
	override isAspectRatioLocked() {
		return true
	}

	override component(shape: VideoCardShape) {
		return (
			<HTMLContainer
				className="media-card media-card--video"
				style={{ width: shape.props.w, height: shape.props.h }}
			>
				<video src={shape.props.url} autoPlay muted loop playsInline />
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: VideoCardShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

export class NoteCardShapeUtil extends BaseBoxShapeUtil<NoteCardShape> {
	static override type = NOTE_CARD_SHAPE_TYPE
	static override props: RecordProps<NoteCardShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		text: T.string,
		color: T.string,
	}

	override getDefaultProps(): NoteCardShape['props'] {
		return { w: 144, h: 96, text: 'Note', color: '#ffd43b' }
	}

	override component(shape: NoteCardShape) {
		return (
			<HTMLContainer
				className="media-card media-card--note"
				style={{
					width: shape.props.w,
					height: shape.props.h,
					backgroundColor: shape.props.color,
				}}
			>
				{shape.props.text}
			</HTMLContainer>
		)
	}

	override getText(shape: NoteCardShape) {
		return shape.props.text
	}

	override getIndicatorPath(shape: NoteCardShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

/*
Two shape types for the board to organize, with different default sizes so you can see how
each layout handles a mix. Neither knows anything about the board: the board reads their
geometry and moves them, so any shape type it accepts works the same way.

[1]
Both extend BaseBoxShapeUtil, which gives them `w`/`h` geometry, resize handles, and a
`getInterpolatedProps` that tweens size. That last one is what lets the board animate a card
to a new size rather than snapping it.

[2]
The video keeps its aspect ratio when you resize it by hand, and the layouts scale cards
proportionally, so it never stretches.
*/
