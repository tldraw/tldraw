import { createContext, useContext } from 'react'
import { Geometry2d, HTMLContainer, Rectangle2d, ShapeUtil, T, TLShape } from 'tldraw'

// ─── PICTIONARY CONTEXT ───────────────────────────────────────────────────────

/**
 * Provides the current `userId` and `drawerId` to shapes rendered inside a
 * player panel. `PictWordCardShapeUtil` reads this context to decide whether
 * the current viewer is the drawer or a guesser, and renders accordingly.
 *
 * Each `<Tldraw>` instance is wrapped in a `PictionaryCtx.Provider` with the
 * appropriate `userId` for that panel, so each panel gets an independent view.
 */
export const PictionaryCtx = createContext<{ userId: string; drawerId: string }>({
	userId: '',
	drawerId: '',
})

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

/**
 * Extracted function component so `useContext` is called in a function
 * component, satisfying the rules-of-hooks lint rule.
 */
function PictWordCardComponent({ shape }: { shape: IPictWordCardShape }) {
	const { userId, drawerId } = useContext(PictionaryCtx)
	// Completely invisible to guessers — not even a placeholder is rendered
	if (userId !== drawerId) return null

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

/**
 * A card that shows the word to draw — but only to the drawer.
 *
 * The `component()` delegates to `PictWordCardComponent`, which reads
 * `PictionaryCtx`. If `userId !== drawerId` it returns `null`, making the
 * shape completely invisible to guessers.
 *
 * `indicator()` always returns `null` so no selection indicator is ever shown,
 * even in the drawer's panel.
 */
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
		return <PictWordCardComponent shape={shape} />
	}

	indicator() {
		return null
	}
}
