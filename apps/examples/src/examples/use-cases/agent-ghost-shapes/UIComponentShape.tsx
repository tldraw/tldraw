import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
} from 'tldraw'

// A single, parameterized custom shape that renders a real React UI component
// (a button, an input, a card, …). The agent proposes these as ghosts, and on
// accept they become real `ui-component` shapes on the canvas. The same
// `UIComponent` is used for both the ghost preview and the accepted shape, so
// what you preview is exactly what you get.

export const UI_COMPONENT_TYPE = 'ui-component'

export type UIVariant =
	| 'card'
	| 'heading'
	| 'text'
	| 'input'
	| 'button'
	| 'checkbox'
	| 'toggle'
	| 'badge'
	| 'avatar'

export const UI_VARIANTS: UIVariant[] = [
	'card',
	'heading',
	'text',
	'input',
	'button',
	'checkbox',
	'toggle',
	'badge',
	'avatar',
]

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[UI_COMPONENT_TYPE]: { w: number; h: number; variant: UIVariant; label: string; accent: string }
	}
}

type UIComponentShape = TLShape<typeof UI_COMPONENT_TYPE>

export class UIComponentShapeUtil extends ShapeUtil<UIComponentShape> {
	static override type = UI_COMPONENT_TYPE
	static override props: RecordProps<UIComponentShape> = {
		w: T.number,
		h: T.number,
		variant: T.literalEnum(...UI_VARIANTS),
		label: T.string,
		accent: T.string,
	}

	getDefaultProps(): UIComponentShape['props'] {
		return { w: 240, h: 48, variant: 'button', label: 'Button', accent: '#8b5cf6' }
	}

	override canResize() {
		return true
	}

	getGeometry(shape: UIComponentShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override onResize(shape: UIComponentShape, info: TLResizeInfo<UIComponentShape>) {
		return resizeBox(shape, info)
	}

	component(shape: UIComponentShape) {
		// `pointerEvents: 'none'` lets tldraw hit-test the shape from its geometry,
		// so it selects and drags like any other shape. Switch to `'all'` only if
		// the rendered UI needs to handle its own clicks.
		return (
			<HTMLContainer style={{ pointerEvents: 'none' }}>
				<UIComponent {...shape.props} />
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: UIComponentShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// ============================================================================
// The presentational component, shared by the shape and the ghost preview.
// ============================================================================

export interface UIComponentProps {
	w: number
	h: number
	variant: UIVariant
	label: string
	accent: string
}

export function UIComponent({ w, h, variant, label, accent }: UIComponentProps) {
	const base: React.CSSProperties = {
		width: w,
		height: h,
		boxSizing: 'border-box',
		fontFamily: 'Inter, system-ui, sans-serif',
		display: 'flex',
		alignItems: 'center',
	}

	switch (variant) {
		case 'card':
			return (
				<div
					style={{
						...base,
						borderRadius: 16,
						background: 'white',
						border: '1px solid #e6e6e6',
						boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
					}}
				/>
			)
		case 'heading':
			return (
				<div style={{ ...base, fontSize: Math.min(h * 0.7, 28), fontWeight: 700, color: '#111' }}>
					{label}
				</div>
			)
		case 'text':
			return (
				<div style={{ ...base, fontSize: Math.min(h * 0.7, 14), color: '#667085' }}>{label}</div>
			)
		case 'input':
			return (
				<div
					style={{
						...base,
						padding: '0 14px',
						borderRadius: 10,
						background: 'white',
						border: '1px solid #d0d5dd',
						color: '#98a2b3',
						fontSize: 15,
					}}
				>
					{label}
				</div>
			)
		case 'button':
			return (
				<div
					style={{
						...base,
						justifyContent: 'center',
						borderRadius: 10,
						background: accent,
						color: 'white',
						fontSize: 15,
						fontWeight: 600,
					}}
				>
					{label}
				</div>
			)
		case 'checkbox':
			return (
				<div style={{ ...base, gap: 10, fontSize: 14, color: '#344054' }}>
					<div
						style={{
							width: 20,
							height: 20,
							borderRadius: 5,
							border: `2px solid ${accent}`,
							flexShrink: 0,
						}}
					/>
					{label}
				</div>
			)
		case 'toggle':
			return (
				<div style={{ ...base, gap: 10, fontSize: 14, color: '#344054' }}>
					<div
						style={{
							width: 38,
							height: 22,
							borderRadius: 999,
							background: accent,
							position: 'relative',
							flexShrink: 0,
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: 2,
								right: 2,
								width: 18,
								height: 18,
								borderRadius: 999,
								background: 'white',
							}}
						/>
					</div>
					{label}
				</div>
			)
		case 'badge':
			return (
				<div
					style={{
						...base,
						width: 'fit-content',
						justifyContent: 'center',
						padding: '0 12px',
						borderRadius: 999,
						background: `${accent}1f`,
						color: accent,
						fontSize: 13,
						fontWeight: 600,
					}}
				>
					{label}
				</div>
			)
		case 'avatar':
			return (
				<div
					style={{
						...base,
						width: h,
						justifyContent: 'center',
						borderRadius: 999,
						background: accent,
						color: 'white',
						fontSize: h * 0.4,
						fontWeight: 600,
					}}
				>
					{initials(label)}
				</div>
			)
	}
}

function initials(label: string): string {
	const parts = label.trim().split(/\s+/).slice(0, 2)
	return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}
