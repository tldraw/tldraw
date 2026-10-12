import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLComponents,
	TLShape,
	Tldraw,
	TldrawUiButton,
	useEditor,
	usePrefersReducedMotion,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './reduced-motion.css'

const PULSE_SHAPE_TYPE = 'pulse-shape'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PULSE_SHAPE_TYPE]: { w: number; h: number }
	}
}

type PulseShape = TLShape<typeof PULSE_SHAPE_TYPE>

// [2]
function PulseShapeComponent() {
	const prefersReducedMotion = usePrefersReducedMotion()

	return (
		<HTMLContainer className="pulse-shape">
			<div className="pulse-shape__content">
				<div className={prefersReducedMotion ? 'pulse-indicator--static' : 'pulse-indicator'} />
				<div className="pulse-shape__label">
					{prefersReducedMotion ? 'Static mode' : 'Animated mode'}
				</div>
			</div>
		</HTMLContainer>
	)
}

// [3]
export class PulseShapeUtil extends ShapeUtil<PulseShape> {
	static override type = PULSE_SHAPE_TYPE
	static override props: RecordProps<PulseShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): PulseShape['props'] {
		return { w: 200, h: 200 }
	}

	getGeometry(shape: PulseShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	component() {
		return <PulseShapeComponent />
	}

	getIndicatorPath(shape: PulseShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// [4]
function MotionToggle() {
	const editor = useEditor()
	const prefersReducedMotion = usePrefersReducedMotion()

	const toggleMotion = () => {
		const currentSpeed = editor.user.getAnimationSpeed()
		editor.user.updateUserPreferences({
			animationSpeed: currentSpeed === 0 ? 1 : 0,
		})
	}

	return (
		<div className="tlui-menu motion-toggle">
			<span className="motion-toggle__label">
				Motion: {prefersReducedMotion ? 'Reduced' : 'Normal'}
			</span>
			<TldrawUiButton type="primary" onClick={toggleMotion}>
				Toggle
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: MotionToggle,
}

const shapeUtils = [PulseShapeUtil]

export default function ReducedMotionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					editor.createShape({ type: PULSE_SHAPE_TYPE, x: 200, y: 200 })
					editor.createShape({ type: PULSE_SHAPE_TYPE, x: 450, y: 200 })
					editor.createShape({ type: PULSE_SHAPE_TYPE, x: 325, y: 450 })
				}}
			/>
		</div>
	)
}

/*
[1]
Registering the props in TLGlobalShapePropsMap is what makes `editor.createShape({ type })`
type-check and gives `TLShape<'pulse-shape'>` its props type.

[2]
`usePrefersReducedMotion()` returns true when the user's tldraw preference has `animationSpeed`
set to 0, or (if no preference is set) when the OS reports `prefers-reduced-motion: reduce`. It
is a hook, so the shape's rendering lives in a React component that `component()` returns; the
component re-renders when the preference changes and swaps the CSS class from the pulsing
indicator to the static one.

[3]
The util itself is minimal: geometry, indicator, and the component above.

[4]
The toggle flips the tldraw preference with `editor.user.updateUserPreferences()`. Setting
`animationSpeed: 0` is what tldraw's own "reduce motion" preference does, so the hook and every
shape using it respond the same way they would to the built-in setting.
*/
