import { useCallback, useEffect, useRef } from 'react'
import { HTMLContainer, Rectangle2d, ShapeUtil, T, TLShape, useEditor, useValue } from 'tldraw'
import { SET_STATE } from './channel'
import { sketchesById } from './registry'
import './sketch-shape.css'

// Register the custom shape's props so `'sketch'` is a known shape type (this is what
// makes createShape/updateShape/`shape.type === 'sketch'` typecheck).
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		sketch: { w: number; h: number; sketchId: string; args: Record<string, unknown> }
	}
}

/**
 * Renders a sketch in the studio's preview iframe (the same one the studio shell uses), so
 * each sketch is a separate document — isolated from the board and from sibling sketches
 * (an editor-embedding scene otherwise shares page-global tooltip/event singletons). The
 * board's args and theme are pushed in over the channel. Non-interactive on the board.
 */
function SketchIframe({ sketchId, args }: { sketchId: string; args: Record<string, unknown> }) {
	const ref = useRef<HTMLIFrameElement>(null)
	const editor = useEditor()
	const theme = useValue<'light' | 'dark'>(
		'theme',
		() => (editor.user.getUserPreferences().colorScheme === 'dark' ? 'dark' : 'light'),
		[editor]
	)
	const post = useCallback(() => {
		const frame = ref.current
		if (frame && frame.contentWindow) {
			frame.contentWindow.postMessage(
				{ type: SET_STATE, id: sketchId, args, env: { theme, locale: 'en' } },
				window.location.origin
			)
		}
	}, [sketchId, args, theme])
	useEffect(() => {
		post()
	}, [post])
	return (
		<iframe
			ref={ref}
			className="sketch-shape__iframe"
			src={`sketch.html?id=${encodeURIComponent(sketchId)}`}
			onLoad={post}
			title={sketchId}
		/>
	)
}

/** A canvas shape that renders one sketch instance by id, with its own editable args. */
export type SketchShape = TLShape<'sketch'>

export class SketchShapeUtil extends ShapeUtil<SketchShape> {
	static override type = 'sketch' as const
	static override props = {
		w: T.number,
		h: T.number,
		sketchId: T.string,
		args: T.dict(T.string, T.unknown),
	}

	getDefaultProps(): SketchShape['props'] {
		return { w: 260, h: 160, sketchId: '', args: {} }
	}

	getGeometry(shape: SketchShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	override canResize() {
		return false
	}

	component(shape: SketchShape) {
		const loaded = sketchesById.get(shape.props.sketchId)
		// Every sketch renders in the studio's preview iframe, so it's isolated from the
		// board and from sibling sketches — the iframe (sketch.html) scales components to
		// fit and fills scenes. Non-interactive on the board (the preview is pointer-none).
		return (
			<HTMLContainer
				className="sketch-shape"
				style={{ width: shape.props.w, height: shape.props.h }}
			>
				<div className="sketch-shape__preview sketch-shape__preview--fill">
					{loaded ? (
						<SketchIframe sketchId={shape.props.sketchId} args={shape.props.args} />
					) : (
						<span>unknown: {shape.props.sketchId}</span>
					)}
				</div>
				{loaded && <div className="sketch-shape__label">{loaded.name}</div>}
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: SketchShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}
