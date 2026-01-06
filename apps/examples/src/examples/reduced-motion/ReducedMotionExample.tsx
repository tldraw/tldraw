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
	track,
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
function PulseShapeComponent({ shape: _shape }: { shape: PulseShape }) {
	const prefersReducedMotion = usePrefersReducedMotion()

	return (
		<HTMLContainer className="pulse-shape">
			<div className="pulse-shape__content">
				{/* [3] */}
				<div className={prefersReducedMotion ? 'pulse-indicator--static' : 'pulse-indicator'} />
				<div className="pulse-shape__label">
					{prefersReducedMotion ? 'Static mode' : 'Animated mode'}
				</div>
			</div>
		</HTMLContainer>
	)
}

// [4]
export class PulseShapeUtil extends ShapeUtil<PulseShape> {
	static override type = PULSE_SHAPE_TYPE
	static override props: RecordProps<PulseShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): PulseShape['props'] {
		return { w: 200, h: 200 }
	}

	override canEdit() {
		return false
	}

	getGeometry(shape: PulseShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	component(shape: PulseShape) {
		return <PulseShapeComponent shape={shape} />
	}

	indicator(shape: PulseShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [5]
const MotionToggle = track(function MotionToggle() {
	const editor = useEditor()
	const prefersReducedMotion = usePrefersReducedMotion()

	const toggleMotion = () => {
		const currentSpeed = editor.user.getAnimationSpeed()
		editor.user.updateUserPreferences({
			animationSpeed: currentSpeed === 0 ? 1 : 0,
		})
	}

	return (
		<div className="motion-toggle">
			<span className="motion-toggle__label">
				Motion: {prefersReducedMotion ? 'Reduced' : 'Normal'}
			</span>
			<TldrawUiButton type="primary" onClick={toggleMotion}>
				Toggle
			</TldrawUiButton>
		</div>
	)
})

// [6]
const components: TLComponents = {
	InFrontOfTheCanvas: MotionToggle,
}

export default function ReducedMotionExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[PulseShapeUtil]}
				components={components}
				onMount={(editor) => {
					// [7]
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
Extend TLGlobalShapePropsMap to register our custom shape type with TypeScript. This shape
has width (w) and height (h) properties.

[2]
PulseShapeComponent is a React component that renders the shape's content. It uses
usePrefersReducedMotion() to check if the user prefers reduced motion. This hook returns
true when either:
- The user has set animationSpeed to 0 in tldraw preferences
- The OS has prefers-reduced-motion enabled

[3]
The visual indicator changes based on motion preference. When reduced motion is preferred,
it shows a static gray circle. Otherwise, it shows an animated blue circle with a pulsing
effect defined in the CSS file.

[4]
PulseShapeUtil class controls the shape's behavior. The component method returns the
PulseShapeComponent, which allows React hooks to be used for checking motion preferences.

[5]
MotionToggle is a custom component that displays the current motion state and provides a
button to toggle between animated and static modes. It uses track() to reactively update
when preferences change, and updateUserPreferences() to modify the animation speed setting.

[6]
Pass the toggle as the SharePanel component. This places it in the top-right corner of the
editor using tldraw's built-in layout system, avoiding custom positioning CSS.

[7]
On mount, we create three pulse shapes to demonstrate the effect. All shapes respond
simultaneously to the motion preference change.
*/
