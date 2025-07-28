import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Box, Editor, TLCameraOptions, TLComponents, Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './education-canvas.css'

// Fixed camera options to prevent zooming/panning
const CAMERA_OPTIONS: Partial<TLCameraOptions> = {
	isLocked: false,
	constraints: {
		initialZoom: 'fit-max',
		baseZoom: 'fit-max',
		bounds: {
			x: 0,
			y: 0,
			w: 600,
			h: 600,
		},
		behavior: { x: 'contain', y: 'contain' },
		padding: { x: 100, y: 100 },
		origin: { x: 0.5, y: 0.5 },
	},
}

const CameraSetup = track(() => {
	const editor = useEditor()

	useEffect(() => {
		if (!editor) return
		editor.run(() => {
			editor.zoomToBounds(new Box(0, 0, 600, 600), {
				inset: 150,
			})
			editor.setCameraOptions(CAMERA_OPTIONS)
			editor.setCamera(editor.getCamera(), {
				immediate: true,
			})
			// editor.updateInstanceState({
			// 	isGridMode: true,
			// })
		})
	}, [editor])

	return null
})

const TICKS = 8

const CartesianGrid = memo(function CartesianGrid() {
	return (
		<svg
			className="cartesian-grid"
			width="600"
			height="600"
			viewBox="0 0 600 600"
			stroke="#aaa"
			color="#aaa"
		>
			{Array.from({ length: TICKS * 2 + 1 }).map((_, i) => {
				const step = 600 / (TICKS * 2)
				const opacity = i === TICKS ? 1 : 0.16
				return (
					<g key={i + '_line'}>
						<line x1={0} y1={i * step} x2={600} y2={i * step} strokeWidth="1" opacity={opacity} />
						<line x1={i * step} y1={0} x2={i * step} y2={600} strokeWidth="1" opacity={opacity} />
					</g>
				)
			})}
			<g>
				{Array.from({ length: TICKS * 2 + 1 }).map((_, i) => {
					const index = i
					if (i - TICKS === 0) return null
					const y = 600 - index * (600 / (TICKS * 2))
					return (
						<g key={i + '_textx'}>
							<text
								key={index}
								x={312}
								y={y}
								dy="0.3em"
								fontFamily="Arial"
								textAnchor="start"
								letterSpacing=".25em"
								stroke="none"
								fill="#aaa"
								fontWeight="bold"
							>
								{-TICKS + index}
							</text>
							<line x1={295} y1={y} x2={305} y2={y} strokeWidth="2" />
						</g>
					)
				})}
				{Array.from({ length: TICKS * 2 + 1 }).map((_, i) => {
					const index = i
					if (i - TICKS === 0) return null
					const x = index * (600 / (TICKS * 2))
					return (
						<g key={i + '_texty'}>
							<text
								key={index}
								x={x}
								y={320}
								dy="0.3em"
								fontFamily="Arial"
								textAnchor="middle"
								stroke="none"
								fill="#aaa"
								fontWeight="bold"
							>
								{-TICKS + index}
							</text>
							<line x1={x} y1={295} x2={x} y2={305} strokeWidth="2" strokeLinecap="round" />
						</g>
					)
				})}
			</g>
		</svg>
	)
})

const components: TLComponents = {
	OnTheCanvas: CartesianGrid,
}

export default function EducationCanvasExample() {
	const [answers, setAnswers] = useState({
		partB: '',
		partC: '',
	})

	const handleAnswerChange = (part: keyof typeof answers, value: string) => {
		setAnswers((prev) => ({ ...prev, [part]: value }))
	}

	const rEditor = useRef<Editor | null>(null)
	const handleMount = useCallback((editor: Editor) => {
		rEditor.current = editor
	}, [])

	const handleSubmit = useCallback(async () => {
		// Normalize answers for comparison
		const normalizeAnswer = (answer: string) => {
			return answer.toLowerCase().replace(/[^a-z0-9(),.-]/g, '')
		}

		// Check Part B - Area (accept 8, 8 square units, 8 units², etc.)
		const normalizedB = normalizeAnswer(answers.partB)
		const isPartBCorrect =
			normalizedB.includes('8') &&
			(normalizedB.includes('square') || normalizedB.includes('unit') || normalizedB === '8')

		// Check Part C - Coordinates (accept (0,7), (0, 7), 0,7, etc.)
		const normalizedC = normalizeAnswer(answers.partC)
		const isPartCCorrect =
			normalizedC.includes('0') &&
			normalizedC.includes('7') &&
			(normalizedC.includes('(0,7)') ||
				normalizedC.includes('0,7') ||
				normalizedC.match(/0.*7/) ||
				normalizedC.match(/7.*0/))

		if (isPartBCorrect && isPartCCorrect) {
			alert('Good job! Both answers are correct!')
		} else if (isPartBCorrect || isPartCCorrect) {
			let message = 'Good progress! '
			if (isPartBCorrect) message += 'Part B is correct. '
			if (isPartCCorrect) message += 'Part C is correct. '
			if (!isPartBCorrect) message += 'Check your area calculation for Part B.'
			if (!isPartCCorrect) message += 'Check your coordinates for Part C.'
			alert(message)
		} else {
			alert('Please check your answers and try again.')
		}

		// Do something with the answers
		const editor = rEditor.current
		if (editor) {
			// For example, get the canvas content and the answers and send it to the server.
			// const result = {
			// 	answers: {
			// 		partA: await editor.toImage(editor.getCurrentPageShapes()),
			// 		partB: answers.partB,
			// 		partC: answers.partC,
			// 	},
			// }
			// console.log(result)
		}
	}, [answers])

	return (
		<div className="education-container">
			{/* Question Panel - Left Half */}
			<div className="question-panel">
				<div className="question-content">
					<h1 className="main-title">Mathematics - Geometry</h1>

					<div className="question-card">
						<h2 className="question-title">Question 1</h2>
						<p className="question-text">
							A triangle ABC has vertices at A(2, 3), B(6, 3), and C(4, 7).
						</p>

						<div className="question-part">
							<p className="question-text">
								<strong>Part A:</strong> Draw triangle ABC on the coordinate grid.
							</p>
						</div>

						<div className="question-part">
							<p className="question-text">
								<strong>Part B:</strong> Calculate the area of triangle ABC.
							</p>
							<div className="answer-input-group">
								<label className="answer-label">
									<strong>Answer:</strong>
								</label>
								<input
									type="text"
									className="answer-input"
									placeholder="Enter the area"
									value={answers.partB}
									onChange={(e) => handleAnswerChange('partB', e.target.value)}
								/>
							</div>
						</div>

						<div className="question-part">
							<p className="question-text">
								<strong>Part C:</strong> Find the coordinates of point D such that ABCD forms a
								parallelogram.
							</p>
							<div className="answer-input-group">
								<label className="answer-label">
									<strong>Answer:</strong>
								</label>
								<input
									type="text"
									className="answer-input"
									placeholder="Enter coordinates as (x, y)"
									value={answers.partC}
									onChange={(e) => handleAnswerChange('partC', e.target.value)}
								/>
							</div>
						</div>

						<button className="submit-button" onClick={handleSubmit}>
							Submit Answers
						</button>
					</div>

					<div className="instructions-card">
						<h3 className="instructions-title">Instructions:</h3>
						<ul className="instructions-list">
							<li>Use the drawing canvas on the right to sketch your solution</li>
							<li>
								You can use the draw tool <kbd>D</kbd> to draw points and the line tool <kbd>L</kbd>{' '}
								to draw lines
							</li>
							<li>
								Use the text tool <kbd>T</kbd> to label points and write calculations
							</li>
							<li>Show all your working clearly</li>
							<li>Enter your final answers in the answer boxes above</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Canvas Panel - Right Half */}
			<div className="canvas-panel">
				<div className="canvas-container">
					<Tldraw
						options={{ maxPages: 1 }}
						persistenceKey="education-canvas"
						components={components}
						onMount={handleMount}
						overrides={{
							tools: (_editor, tools) => {
								// These are the tool ids that are allowed to be used in the education canvas...
								const allowedTools = ['select', 'hand', 'draw', 'eraser', 'line', 'text']
								// Tools are keyed by their id, so we can delete off all the tools that are not in the allowedTools array
								for (const key in tools) {
									if (!allowedTools.includes(key)) {
										delete tools[key]
									}
								}
								// Return the mutated tools
								return tools
							},
						}}
					>
						<CameraSetup />
					</Tldraw>
				</div>
			</div>
		</div>
	)
}
