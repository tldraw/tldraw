import { getLiveCommentThreads, useCommentingEnabled } from '@tldraw/commenting'
import { CSSProperties, RefObject, useRef, useState } from 'react'
import { Editor, GeoShapeGeoStyle, TLShape, useEditor, useValue } from 'tldraw'
import { WhiteboardStyleMenus } from './WhiteboardStyleMenus'
import { supportsWhiteboardPen, whiteboardColors, WhiteboardPen } from './whiteboardTheme'

interface WhiteboardControlsProps {
	pen: RefObject<WhiteboardPen>
	onCancel: () => void
	onAccept: () => void
	isSaving: boolean
	error: string | null
}

const icons = {
	select: (
		<path
			stroke="currentColor"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			d="M11.258 18.674c-.568 1.217-2.327 1.131-2.774-.135L4.044 5.958c-.42-1.189.725-2.334 1.914-1.914l12.58 4.44c1.267.447 1.353 2.206.136 2.774l-4.562 2.129a1.5 1.5 0 0 0-.725.725z"
		/>
	),
	draw: (
		<path d="M2.055 12.31a.72.72 0 0 1 .008-1.017L3.45 9.905a195 195 0 0 1 3.62-3.541q1.521-1.443 2.594-2.303 1.072-.867 1.83-1.214.756-.347 1.316-.237.56.111 1.049.6.497.496.544 1.112.048.606-.339 1.403t-1.183 1.853q-.796 1.05-1.987 2.421-1.325 1.523-2.066 2.532-.741 1-.954 1.593-.206.583.063.843.22.229.686.056.472-.174 1.246-.781.78-.615 1.94-1.703 1.285-1.222 2.247-1.893.963-.678 1.656-.773.702-.102 1.207.41.378.371.402.876.023.495-.268 1.174-.284.679-.844 1.601l-.607 1.018a5.5 5.5 0 0 0-.34.623q-.086.212-.007.291.07.072.268-.031.197-.111.536-.387.346-.284.852-.749a.7.7 0 0 1 .504-.213q.292 0 .505.205a.66.66 0 0 1 .205.52q-.007.3-.268.553-1.143 1.168-2.05 1.474-.907.309-1.475-.26-.37-.363-.41-.82a2.3 2.3 0 0 1 .134-.954 6.7 6.7 0 0 1 .457-1.025q.285-.52.568-1.01.45-.773.726-1.23.284-.465.079-.678-.119-.11-.379.008-.252.111-.647.426-.386.316-.899.796-.504.474-1.135 1.08-.614.6-1.262 1.16-.646.56-1.285.985-.64.426-1.238.647-.6.221-1.136.142-.536-.07-.985-.513-.506-.505-.56-1.12-.048-.623.236-1.316.284-.703.789-1.443.513-.75 1.143-1.514.64-.773 1.286-1.53.788-.93 1.443-1.711.654-.79 1.088-1.412.442-.622.583-1.057.15-.434-.078-.662-.253-.26-.718-.11-.465.141-1.16.654-.693.512-1.64 1.388a93 93 0 0 0-2.152 2.066q-1.215 1.191-2.72 2.697L3.071 12.31a.72.72 0 0 1-.504.22.7.7 0 0 1-.513-.22" />
	),
	text: (
		<path
			stroke="currentColor"
			fill="none"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.33"
			d="M4.2 6.218V4.33h11.6v1.888M10 4.33v11.33m0 0H8.286m1.714 0h1.714"
		/>
	),
	comment: <path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" />,
	shapes: (
		<g stroke="currentColor" fill="none" strokeWidth="1.5">
			<path strokeLinecap="round" d="M12.75 7.25a5.5 5.5 0 1 0-5.5 5.5" />
			<rect width="10.5" height="10.5" x="7.25" y="7.25" rx="2" />
		</g>
	),
	eraser: (
		<path d="M10.651 2.155a3.17 3.17 0 0 1 1.957 0c.402.13.745.362 1.095.659.344.292.738.687 1.225 1.174l1.01 1.01c.487.487.882.88 1.174 1.224.297.35.528.694.66 1.096.206.635.206 1.32 0 1.956-.132.402-.363.745-.66 1.096-.292.344-.687.737-1.174 1.224l-4.344 4.344c-.487.487-.88.882-1.224 1.174-.35.297-.694.528-1.096.66a3.17 3.17 0 0 1-1.956 0c-.402-.132-.746-.363-1.096-.66-.344-.292-.737-.687-1.224-1.174l-1.01-1.01c-.487-.487-.882-.881-1.174-1.225-.297-.35-.528-.693-.66-1.095a3.17 3.17 0 0 1 0-1.957c.132-.402.363-.745.66-1.095.292-.344.687-.738 1.174-1.225L8.33 3.988c.487-.487.88-.882 1.225-1.174.35-.297.693-.528 1.095-.66M4.928 9.27c-.502.503-.851.852-1.1 1.146-.244.287-.354.477-.408.645-.12.369-.12.766 0 1.135.054.168.164.358.408.645.249.294.598.643 1.1 1.146l1.01 1.01c.503.502.852.851 1.146 1.1.287.244.477.353.645.407.369.12.765.12 1.134 0 .169-.054.359-.163.646-.407.294-.249.642-.598 1.145-1.1l.034-.036-5.726-5.726zm7.269-5.851a1.84 1.84 0 0 0-1.135 0c-.168.054-.358.164-.645.408-.294.249-.643.598-1.146 1.1L5.903 8.295l5.726 5.726 3.369-3.367c.502-.503.851-.851 1.1-1.145.244-.287.353-.477.407-.646.12-.369.12-.765 0-1.134-.054-.168-.163-.358-.407-.645-.249-.294-.598-.643-1.1-1.146l-1.01-1.01c-.503-.502-.852-.851-1.146-1.1-.287-.244-.477-.354-.645-.408" />
	),
	close: <path d="m5 5 14 14M19 5 5 19" />,
	undo: <path d="m8 3-5 5 5 5M3 8h11a7 7 0 0 1 0 14h-3" />,
	redo: <path d="m16 3 5 5-5 5M21 8H10a7 7 0 0 0 0 14h3" />,
	check: <path d="m4 13 6 6L21 4" />,
	rectangle: <rect x="4" y="5" width="16" height="14" rx="1" />,
	ellipse: <ellipse cx="12" cy="12" rx="9" ry="7" />,
	triangle: <path d="m12 3 10 18H2L12 3Z" />,
	diamond: <path d="m12 2 10 10-10 10L2 12 12 2Z" />,
	line: <path d="m4 20 16-16" />,
	arrow: <path d="m4 20 16-16M9 4h11v11" />,
}

type IconName = keyof typeof icons

function Icon({ name }: { name: IconName }) {
	if (['select', 'draw', 'text', 'shapes', 'eraser'].includes(name)) {
		return (
			<svg
				viewBox={name === 'select' ? '0 0 24 24' : '0 0 20 20'}
				className={name === 'select' ? 'whiteboard-cursor-icon' : undefined}
				fill="currentColor"
				aria-hidden="true"
			>
				{icons[name]}
			</svg>
		)
	}

	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{icons[name]}
		</svg>
	)
}

interface IconButtonProps {
	label: string
	icon: IconName
	onClick: () => void
	className?: string
	pressed?: boolean
	disabled?: boolean
	expanded?: boolean
}

function IconButton({
	label,
	icon,
	onClick,
	className = '',
	pressed,
	disabled,
	expanded,
}: IconButtonProps) {
	return (
		<button
			type="button"
			className={`whiteboard-button ${className}`}
			aria-label={label}
			title={label}
			aria-pressed={pressed}
			aria-expanded={expanded}
			disabled={disabled}
			onClick={onClick}
		>
			<Icon name={icon} />
		</button>
	)
}

function getSelectedPenShapes(editor: Editor) {
	const shapes = new Map<string, TLShape>()
	function visit(shape: TLShape) {
		if (shape.type === 'group') {
			for (const id of editor.getSortedChildIdsForParent(shape.id)) {
				const child = editor.getShape(id)
				if (child) visit(child)
			}
		} else if (supportsWhiteboardPen(shape)) shapes.set(shape.id, shape)
	}
	for (const shape of editor.getSelectedShapes()) visit(shape)
	return [...shapes.values()]
}

export function WhiteboardControls({
	pen,
	onCancel,
	onAccept,
	isSaving,
	error,
}: WhiteboardControlsProps) {
	const editor = useEditor()
	const commentingEnabled = useCommentingEnabled()
	const [nextPen, setNextPen] = useState(pen.current)
	const [showShapes, setShowShapes] = useState(false)
	const sliderGesture = useRef(false)
	const state = useValue(
		'whiteboard controls',
		() => {
			const selected = getSelectedPenShapes(editor)
			const first = selected[0]
			return {
				tool: editor.getCurrentToolId(),
				canUndo: editor.canUndo(),
				canRedo: editor.canRedo(),
				hasContent:
					editor.getCurrentPageShapeIds().size > 0 || getLiveCommentThreads(editor).length > 0,
				color:
					first && selected.every((shape) => shape.meta.strokeColor === first.meta.strokeColor)
						? typeof first.meta.strokeColor === 'string'
							? first.meta.strokeColor
							: nextPen.color
						: selected.length
							? null
							: nextPen.color,
				width: typeof first?.meta.strokeWidth === 'number' ? first.meta.strokeWidth : nextPen.width,
			}
		},
		[editor, nextPen]
	)

	function updatePen(change: Partial<WhiteboardPen>) {
		pen.current = { ...pen.current, ...change }
		setNextPen(pen.current)
		const meta = {
			...(change.color !== undefined ? { strokeColor: change.color } : {}),
			...(change.width !== undefined ? { strokeWidth: change.width } : {}),
		}
		editor.updateShapes(
			getSelectedPenShapes(editor).map((shape) => ({
				id: shape.id,
				type: shape.type,
				meta: { ...shape.meta, ...meta },
			}))
		)
	}

	function chooseColor(color: string) {
		editor.markHistoryStoppingPoint('change color')
		updatePen({ color })
		setShowShapes(false)
	}

	function chooseTool(tool: string) {
		editor.setCurrentTool(tool)
		setShowShapes(false)
		editor.focus()
	}

	function chooseShape(shape: 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'line' | 'arrow') {
		if (shape === 'line' || shape === 'arrow') chooseTool(shape)
		else {
			editor.setStyleForNextShapes(GeoShapeGeoStyle, shape)
			chooseTool('geo')
		}
	}

	return (
		<div
			className="whiteboard-controls"
			inert={isSaving}
			onPointerDown={(event) => event.stopPropagation()}
			onKeyDown={(event) => {
				if (event.key === 'Escape' && showShapes) {
					setShowShapes(false)
					event.stopPropagation()
				}
			}}
		>
			<IconButton
				label="Cancel sketch"
				icon="close"
				onClick={onCancel}
				className="whiteboard-close"
				disabled={isSaving}
			/>
			<div className="whiteboard-toolbar" role="toolbar" aria-label="Drawing tools">
				<IconButton
					label="Select"
					icon="select"
					pressed={state.tool === 'select'}
					onClick={() => chooseTool('select')}
				/>
				<IconButton
					label="Draw"
					icon="draw"
					pressed={state.tool === 'draw'}
					onClick={() => chooseTool('draw')}
				/>
				<IconButton
					label="Text"
					icon="text"
					pressed={state.tool === 'text'}
					onClick={() => chooseTool('text')}
				/>
				<IconButton
					label="Comment"
					icon="comment"
					pressed={state.tool === 'comment'}
					disabled={!commentingEnabled}
					onClick={() => chooseTool('comment')}
				/>
				<div
					className="whiteboard-shapes"
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) setShowShapes(false)
					}}
				>
					<IconButton
						label="Shapes"
						icon="shapes"
						pressed={['geo', 'line', 'arrow'].includes(state.tool)}
						expanded={showShapes}
						onClick={() => setShowShapes(!showShapes)}
					/>
					{showShapes && (
						<div className="whiteboard-shape-picker" role="group" aria-label="Choose a shape">
							{(['rectangle', 'ellipse', 'triangle', 'diamond', 'line', 'arrow'] as const).map(
								(shape) => (
									<IconButton
										key={shape}
										label={shape[0].toUpperCase() + shape.slice(1)}
										icon={shape}
										onClick={() => chooseShape(shape)}
									/>
								)
							)}
						</div>
					)}
				</div>
				<IconButton
					label="Eraser"
					icon="eraser"
					pressed={state.tool === 'eraser'}
					onClick={() => chooseTool('eraser')}
				/>
			</div>
			<div className="whiteboard-history" role="group" aria-label="History">
				<IconButton
					label="Undo"
					icon="undo"
					disabled={!state.canUndo || isSaving}
					onClick={() => editor.undo()}
				/>
				<IconButton
					label="Redo"
					icon="redo"
					disabled={!state.canRedo || isSaving}
					onClick={() => editor.redo()}
				/>
			</div>
			<div className="whiteboard-sidebar">
				<div className="whiteboard-thickness">
					<input
						type="range"
						min="1"
						max="32"
						step="0.25"
						value={state.width}
						aria-label="Stroke thickness"
						aria-orientation="vertical"
						aria-valuetext={`${state.width} pixels`}
						title="Stroke thickness"
						onPointerDown={() => {
							sliderGesture.current = true
							editor.markHistoryStoppingPoint('change thickness')
						}}
						onPointerUp={() => {
							sliderGesture.current = false
						}}
						onPointerCancel={() => {
							sliderGesture.current = false
						}}
						onChange={(event) => {
							if (!sliderGesture.current) editor.markHistoryStoppingPoint('change thickness')
							updatePen({ width: Number(event.target.value) })
						}}
					/>
				</div>
			</div>
			<div className="whiteboard-bottom-controls">
				<div className="whiteboard-palette" role="group" aria-label="Stroke colors">
					<label
						className="whiteboard-color whiteboard-color--custom"
						title="Custom color"
						data-active={
							state.color !== null && !whiteboardColors.some(([, hex]) => hex === state.color)
						}
					>
						<input
							type="color"
							aria-label="Custom color"
							value={state.color ?? nextPen.color}
							onInput={(event) => chooseColor(event.currentTarget.value)}
						/>
					</label>
					{whiteboardColors.map(([name, hex]) => (
						<button
							key={name}
							type="button"
							className="whiteboard-color"
							aria-label={name}
							title={name}
							aria-pressed={state.color === hex}
							style={{ '--swatch-color': hex } as CSSProperties}
							onClick={() => chooseColor(hex)}
						/>
					))}
				</div>
				<WhiteboardStyleMenus key={state.tool} />
			</div>
			{error && (
				<p role="alert" className="whiteboard-error">
					{error}
				</p>
			)}
			<IconButton
				label={isSaving ? 'Attaching sketch' : 'Attach sketch'}
				icon="check"
				className="whiteboard-accept"
				disabled={!state.hasContent || isSaving}
				onClick={onAccept}
			/>
		</div>
	)
}
