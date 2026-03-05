import { Geometry2d, HTMLContainer, Rectangle2d, ShapeUtil, T, TLShape } from 'tldraw'

// ─── TYPE AUGMENTATION ────────────────────────────────────────────────────────

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		'pict-word-card': { word: string }
	}
}

export type IPictWordCardShape = TLShape<'pict-word-card'>

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CARD_W = 240
const CARD_H = 80

// ─── WORD CARD SHAPE ──────────────────────────────────────────────────────────

/** Word card — visible only to the drawer via the view.shape rule wired through getShapeVisibility. */
export class PictWordCardShapeUtil extends ShapeUtil<IPictWordCardShape> {
	static override type = 'pict-word-card' as const
	static override props = { word: T.string }

	getDefaultProps(): IPictWordCardShape['props'] {
		return { word: '' }
	}

	override canResize() {
		return false
	}
	override canEdit() {
		return false
	}
	override canBind() {
		return false
	}

	getGeometry(): Geometry2d {
		return new Rectangle2d({ width: CARD_W, height: CARD_H, isFilled: true })
	}

	component(shape: IPictWordCardShape) {
		return (
			<HTMLContainer>
				<div
					style={{
						width: CARD_W,
						height: CARD_H,
						background: '#fffbe6',
						border: '2px solid #f0c040',
						borderRadius: 8,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 2,
						userSelect: 'none',
						pointerEvents: 'none',
					}}
				>
					<span style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
						DRAW THIS
					</span>
					<span style={{ fontSize: 22, fontWeight: 'bold', color: '#333' }}>
						{shape.props.word}
					</span>
				</div>
			</HTMLContainer>
		)
	}

	indicator() {
		return null
	}
}
