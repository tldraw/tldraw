import { BaseBoxShapeUtil, HTMLContainer, T, TLShape } from 'tldraw'

export const PLAYER_TYPE = 'player'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PLAYER_TYPE]: {
			w: number
			h: number
			ownerId: string
			name: string
			color: string
			facing: 'left' | 'right'
		}
	}
}

// [2]
export type PlayerShape = TLShape<typeof PLAYER_TYPE>

// [3]
export class PlayerShapeUtil extends BaseBoxShapeUtil<PlayerShape> {
	static override type = PLAYER_TYPE
	static override props = {
		w: T.positiveNumber,
		h: T.positiveNumber,
		ownerId: T.string,
		name: T.string,
		color: T.string,
		facing: T.literalEnum('left', 'right'),
	}

	override getDefaultProps(): PlayerShape['props'] {
		return { w: 44, h: 56, ownerId: '', name: 'Player', color: '#7b66dc', facing: 'right' }
	}

	// [4]
	override component(shape: PlayerShape) {
		const { color, name, facing } = shape.props
		// Shift the pupils toward the direction of travel so it's clear which way
		// each player is facing. The pupil is 46% of the eye wide, so these two
		// offsets leave it the same 6% gap from the eye edge whichever way it looks.
		const pupil = facing === 'right' ? '48%' : '6%'
		return (
			<HTMLContainer className="platformer-player">
				{/* Only show a name tag for players whose owner actually has a name set. */}
				{name.trim() !== '' && <div className="platformer-player__name">{name}</div>}
				<div className="platformer-player__body" style={{ backgroundColor: color }}>
					<div className="platformer-player__eye">
						<div className="platformer-player__pupil" style={{ left: pupil }} />
					</div>
					<div className="platformer-player__eye">
						<div className="platformer-player__pupil" style={{ left: pupil }} />
					</div>
				</div>
			</HTMLContainer>
		)
	}

	// [5]
	override getIndicatorPath(shape: PlayerShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

/*
[1]
Register the player shape's props with tldraw's global type map so the rest of
the SDK knows about them.

[2]
Define the shape type from its string type, the same way the built-in shapes do.

[3]
The shape util. We extend BaseBoxShapeUtil, which gives the player box geometry,
resize handles, and hit-testing for free — everything needed for it to behave
like a normal, draggable shape. The physics that move it live outside the util,
in the example's game loop.

[4]
The rendered avatar: a coloured body with two googly eyes. The body colour and
name come from the controlling user's tldraw identity, so each collaborator's
character matches their cursor.

[5]
The selection indicator drawn when the shape is selected.
*/
