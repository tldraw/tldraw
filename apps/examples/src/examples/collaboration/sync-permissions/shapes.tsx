import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLShape,
	commentSchemaRecords,
	createTLSchema,
	defaultShapeSchemas,
} from 'tldraw'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		'poker-card': { w: number; h: number; face: string; revealed: boolean }
		redacted: { w: number; h: number }
	}
}

export type CardShape = TLShape<'poker-card'>
export type RedactedShape = TLShape<'redacted'>

/** A playing card. Its face is masked on the server for every player but its owner. */
export class CardShapeUtil extends BaseBoxShapeUtil<CardShape> {
	static override type = 'poker-card' as const
	static override props = {
		w: T.positiveNumber,
		h: T.positiveNumber,
		face: T.string,
		revealed: T.boolean,
	}

	override getDefaultProps() {
		return { w: 90, h: 130, face: '??', revealed: false }
	}

	override canResize() {
		return false
	}

	override component(shape: CardShape) {
		const hidden = shape.props.face === '??'
		const red = /[♥♦]/.test(shape.props.face)
		return (
			<HTMLContainer
				className={`perm-card ${hidden ? 'perm-card--back' : ''} ${red ? 'perm-card--red' : ''}`}
			>
				<span>{hidden ? '' : shape.props.face}</span>
				<small>{shape.props.revealed ? 'face up' : hidden ? 'hidden' : 'only you see this'}</small>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: CardShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

/**
 * What a reader without clearance gets in place of a redacted shape: the bounds, nothing else.
 * The server makes it in a `beforeRead` hook; nobody creates one.
 */
export class RedactedShapeUtil extends BaseBoxShapeUtil<RedactedShape> {
	static override type = 'redacted' as const
	static override props = { w: T.positiveNumber, h: T.positiveNumber }

	override getDefaultProps() {
		return { w: 100, h: 100 }
	}

	override canResize() {
		return false
	}

	override component() {
		return <HTMLContainer className="perm-redacted">REDACTED</HTMLContainer>
	}

	override getIndicatorPath(shape: RedactedShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

export const customShapeUtils = [CardShapeUtil, RedactedShapeUtil]

/** One schema for the room and every client: default shapes, the two above, and comments. */
export const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		'poker-card': { props: CardShapeUtil.props },
		redacted: { props: RedactedShapeUtil.props },
	},
	records: commentSchemaRecords,
})
