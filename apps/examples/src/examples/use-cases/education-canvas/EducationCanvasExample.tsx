import { memo, useCallback, useRef, useState } from 'react'
import { Editor, TLComponents, TLUiOverrides, Tldraw, TldrawOptions } from 'tldraw'
import 'tldraw/tldraw.css'
import './education-canvas.css'

const GRID_SIZE = 600

// [1]
const options: Partial<TldrawOptions> = {
	maxPages: 1,
	camera: {
		constraints: {
			initialZoom: 'fit-max',
			baseZoom: 'fit-max',
			bounds: { x: 0, y: 0, w: GRID_SIZE, h: GRID_SIZE },
			behavior: { x: 'contain', y: 'contain' },
			padding: { x: 100, y: 100 },
			origin: { x: 0.5, y: 0.5 },
		},
	},
}

// [2]
const overrides: TLUiOverrides = {
	tools: (_editor, tools) => {
		const allowedTools = ['select', 'hand', 'draw', 'eraser', 'line', 'text']
		for (const key in tools) {
			if (!allowedTools.includes(key)) {
				delete tools[key]
			}
		}
		return tools
	},
}

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

// [3]
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
		// Camera options only set the constraints; a reset applies the initial zoom.
		editor.setCamera(editor.getCamera(), { reset: true })
	}, [])

	const handleSubmit = useCallback(() => {
		const normalizeAnswer = (answer: string) => {
			return answer.toLowerCase().replace(/[^a-z0-9(),.-]/g, '')
		}

		// Accept "8", "8 square units", "8 units²", and so on
		const normalizedB = normalizeAnswer(answers.partB)
		const isPartBCorrect =
			normalizedB.includes('8') &&
			(normalizedB.includes('square') || normalizedB.includes('unit') || normalizedB === '8')

		// Accept "(0,7)", "(0, 7)", "0,7", and so on
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

		// [4]
		const editor = rEditor.current
		if (editor) {
			// e.g. `await editor.toImage([...editor.getCurrentPageShapeIds()])` for part A
		}
	}, [answers])

	return (
		<div className="education-container">
			<div className="question-panel">
				<div className="question-content">
					<h1 className="main-title">Mathematics: geometry</h1>

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
							Submit answers
						</button>
					</div>

					<div className="instructions-card">
						<h3 className="instructions-title">Instructions</h3>
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

			<div className="canvas-panel">
				<div className="canvas-container">
					<Tldraw
						options={options}
						persistenceKey="education-canvas"
						components={components}
						overrides={overrides}
						onMount={handleMount}
					/>
				</div>
			</div>
		</div>
	)
}

/*
[1]
Camera constraints keep the student on the 600x600 grid: `bounds` is the grid, `contain`
stops panning away from it, and `fit-max` zooms so the whole grid fits with 100px padding.
`maxPages: 1` removes the page menu so there is only one canvas to hand in.

[2]
The `tools` override receives every registered tool keyed by id. Deleting the ones we don't
want removes them from the toolbar and keyboard shortcuts, leaving a small set suited to a
worksheet.

[3]
The coordinate grid is a plain SVG rendered in the `OnTheCanvas` slot, so it sits in page
space under the shapes and pans and zooms with the camera.

[4]
The editor ref is only used at submit time, so a ref set in `onMount` is enough. This is
where you would export the drawing and post it along with the typed answers.
*/
