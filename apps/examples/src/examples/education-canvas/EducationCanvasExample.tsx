import { useEffect, useRef } from 'react'
import { TLCameraOptions, TLComponents, Tldraw, track, useEditor, useQuickReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import './education-canvas.css'

// Fixed camera options to prevent zooming/panning
const CAMERA_OPTIONS: Partial<TLCameraOptions> = {
	isLocked: false,
	constraints: {
		initialZoom: 'fit-max',
		baseZoom: 'fit-max',
		bounds: {
			x: -300,
			y: -300,
			w: 600, // Canvas width
			h: 600, // Canvas height
		},
		behavior: { x: 'inside', y: 'inside' },
		padding: { x: 20, y: 20 },
		origin: { x: 0, y: 0 },
	},
}

const CameraSetup = track(() => {
	const editor = useEditor()

	useEffect(() => {
		if (!editor) return
		editor.run(() => {
			editor.centerOnPoint({ x: 0, y: 0 })
			editor.setCameraOptions(CAMERA_OPTIONS)
			editor.setCamera(editor.getCamera(), {
				immediate: true,
			})
			editor.updateInstanceState({
				isGridMode: true,
			})
		})
	}, [editor])

	return null
})

function MaskWindow() {
	const editor = useEditor()
	const ref = useRef<HTMLDivElement>(null)

	useQuickReactor(
		'clip',
		() => {
			const elm = ref.current
			if (!elm) return

			const vsb = editor.getViewportPageBounds()
			const topLeft = { x: 0, y: 0 }
			const bottomRight = editor.pageToScreen({ x: 600, y: 600 })

			console.log(topLeft, bottomRight)

			// Since there's no reliable "reverse clip path", we wind around the corners in order to turn our clip into a mask
			// elm.style.clipPath = `polygon(0% 0%, ${tl.x}px 0%, ${tl.x}px ${tl.y}px, ${bl.x}px ${bl.y}px, ${br.x}px ${br.y}px, ${tr.x}px ${tr.y}px, ${tl.x}px ${tl.y}px, ${tl.x}px 0%, 100% 0%, 100% 100%, 0% 100%)`
		},
		[editor]
	)

	return <div ref={ref} className="mask-fg" />
}

function CartesianGrid() {
	return (
		<svg className="cartesian-grid" width="600" height="600" viewBox="-300 -300 600 600">
			<line x1={-300} y1={0} x2={300} y2={0} stroke="#777" strokeWidth="2" />
			<line x1={0} y1={-300} x2={0} y2={300} stroke="#777" strokeWidth="2" />
		</svg>
	)
}

const components: TLComponents = {
	OnTheCanvas: () => <CartesianGrid />,
	InFrontOfTheCanvas: () => <MaskWindow />,
}

export default function EducationCanvasExample() {
	return (
		<div className="education-container">
			{/* Question Panel - Left Half */}
			<div className="question-panel">
				<div className="question-content">
					<h1 className="main-title">GCSE Mathematics - Geometry</h1>

					<div className="question-card">
						<h2 className="question-title">Question 1</h2>
						<p className="question-text">
							A triangle ABC has vertices at A(2, 3), B(6, 3), and C(4, 7).
						</p>
						<p className="question-text">
							<strong>Part (a):</strong> Draw triangle ABC on the coordinate grid.
						</p>
						<p className="question-text">
							<strong>Part (b):</strong> Calculate the area of triangle ABC.
						</p>
						<p className="question-text">
							<strong>Part (c):</strong> Find the coordinates of point D such that ABCD forms a
							parallelogram.
						</p>
					</div>

					<div className="instructions-card">
						<h3 className="instructions-title">Instructions:</h3>
						<ul className="instructions-list">
							<li>Use the drawing canvas on the right to sketch your solution</li>
							<li>You can use the draw tool to sketch coordinates and shapes</li>
							<li>Use the text tool to label points and write calculations</li>
							<li>Show all your working clearly</li>
						</ul>
					</div>

					<div className="hint-card">
						<p className="hint-text">
							<strong>Hint:</strong> For the area calculation, you can use the formula: Area = ½ ×
							base × height, or the coordinate formula: Area = ½|x₁(y₂-y₃) + x₂(y₃-y₁) + x₃(y₁-y₂)|
						</p>
					</div>
				</div>
			</div>

			{/* Canvas Panel - Right Half */}
			<div className="canvas-panel">
				<div className="canvas-container">
					<Tldraw persistenceKey="education-canvas" components={components}>
						<CameraSetup />
					</Tldraw>
				</div>
			</div>
		</div>
	)
}
