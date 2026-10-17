import { CSSProperties, useState } from 'react'
import { createPortal } from 'react-dom'
import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLShape, useValue } from 'tldraw'
import { buttonTheme } from './buttonTheme'
import { BUTTON_VARIANT_IDS, ButtonVariant, FRAME_HTML } from './buttonTokens'
import { LabButton } from './LabButton'

// There's a guide at the bottom of this file!

const BUTTON_FRAME_TYPE = 'button-frame'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[BUTTON_FRAME_TYPE]: {
			w: number
			h: number
			variant: ButtonVariant
			overrides: Record<string, string>
		}
	}
}

export type ButtonFrameShape = TLShape<typeof BUTTON_FRAME_TYPE>

export class ButtonFrameShapeUtil extends BaseBoxShapeUtil<ButtonFrameShape> {
	static override type = BUTTON_FRAME_TYPE
	static override props: RecordProps<ButtonFrameShape> = {
		w: T.number,
		h: T.number,
		variant: T.literalEnum(...BUTTON_VARIANT_IDS),
		// [1]
		overrides: T.dict(T.string, T.string),
	}

	override canEdit() {
		return true
	}

	getDefaultProps(): ButtonFrameShape['props'] {
		return {
			w: 240,
			h: 160,
			variant: 'primary',
			overrides: {},
		}
	}

	component(shape: ButtonFrameShape) {
		const isEditing = this.editor.getEditingShapeId() === shape.id
		const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
		const overrideCount = Object.keys(shape.props.overrides).length

		return (
			<HTMLContainer
				id={shape.id}
				className="button-frame-shape"
				onPointerDown={isEditing ? this.editor.markEventAsHandled : undefined}
				// [2]
				style={{ pointerEvents: isEditing ? 'all' : 'none' }}
			>
				<ButtonFrame variant={shape.props.variant} overrides={shape.props.overrides} />
				<div className="button-frame-caption">
					<span className="button-frame-caption__variant">{shape.props.variant}</span>
					{overrideCount > 0 && (
						<span>
							{overrideCount} override{overrideCount === 1 ? '' : 's'}
						</span>
					)}
				</div>
				{isSelected && !isEditing && (
					<div className="button-frame-hint">Double-click to interact</div>
				)}
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: ButtonFrameShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function ButtonFrame({
	variant,
	overrides,
}: {
	variant: ButtonVariant
	overrides: Record<string, string>
}) {
	const [frameBody, setFrameBody] = useState<HTMLElement | null>(null)
	const theme = useValue(buttonTheme)

	// [3]
	const tokens = { ...theme.variants[variant], ...overrides } as CSSProperties

	return (
		<>
			<iframe
				className="button-frame-iframe"
				title={`${variant} button`}
				srcDoc={FRAME_HTML}
				onLoad={(e) => setFrameBody(e.currentTarget.contentDocument?.body ?? null)}
			/>
			{frameBody &&
				// [4]
				createPortal(
					<>
						<style>{theme.css}</style>
						<div className="frame-root" style={tokens}>
							<LabButton label={variant[0].toUpperCase() + variant.slice(1)} />
						</div>
					</>,
					frameBody
				)}
		</>
	)
}

/*
A shape that renders the shared LabButton component inside its own iframe,
styled by a variant's design tokens plus any per-shape overrides.

[1]
Overrides are a plain string-to-string dictionary of CSS custom properties, so
the shape only stores what the user changed. Everything else falls through to
the variant's defaults, and deleting an override reverts the token.

[2]
Like the embed shape, the iframe only receives pointer events while the shape
is being edited (double-click it). Otherwise pointer events stay with the
canvas so you can select, drag, and resize the shape.

[3]
The frame reads the live theme atom, so it re-renders whenever a variant's
base tokens or the button stylesheet change. Merging the variant's current
tokens with the shape's overrides produces the full token set, applied as CSS
custom properties on the frame root inside the iframe. The button's
stylesheet reads these with var(), so any edit restyles the button
immediately without reloading the iframe.

[4]
srcDoc iframes are same-origin, so React can portal the LabButton — and the
button's stylesheet itself — straight into the iframe's body. The document
loaded by srcDoc only contains the frame chrome and never reloads; React owns
the style element, so live-editing the CSS source updates every frame at
once.
*/
