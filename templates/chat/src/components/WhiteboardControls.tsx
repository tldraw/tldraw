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
		<path d="M5.1 10.3C4.3 8.1 6.1 6.3 8.3 7.1L28.6 14.5C31 15.4 31.1 18 28.8 19.1L20.1 23.2 16 31.8C14.9 34.1 12.3 34 11.4 31.6Z" />
	),
	draw: (
		<path d="M3 21 16.5 8.1C24.1 1 28.2 3.5 21.7 11.1L10.2 24.3C5.4 30 10 31.9 15.7 26.7L22.6 20.7C27.3 16.6 28.9 19.6 24.9 24.5L21.9 28.4C18.9 32.4 23.5 32.8 28.1 28.5L32 25.1" />
	),
	text: <path d="M6.5 11V6.5h23V11M18 6.5v23M13.5 29.5h9" />,
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
	if (name === 'eraser' || name === 'shapes') {
		return (
			<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				{icons[name]}
			</svg>
		)
	}

	const isDrawingTool = ['select', 'draw', 'text'].includes(name)
	return (
		<svg
			viewBox={isDrawingTool ? '0 0 36 36' : '0 0 24 24'}
			fill="none"
			stroke="currentColor"
			strokeWidth={isDrawingTool ? 2.7 : 1.8}
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
				hasShapes: editor.getCurrentPageShapeIds().size > 0,
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
				disabled={!state.hasShapes || isSaving}
				onClick={onAccept}
			/>
		</div>
	)
}
