import { getLiveCommentThreads, useCommentingEnabled } from '@tldraw/commenting'
import { CSSProperties, RefObject, useRef, useState } from 'react'
import { Editor, GeoShapeGeoStyle, TLShape, useEditor, useValue } from 'tldraw'
import { useIsDarkMode } from '../hooks/useIsDarkMode'
import { getWhiteboardColors, supportsWhiteboardPen, WhiteboardPen } from './whiteboardTheme'

interface WhiteboardControlsProps {
	pen: RefObject<WhiteboardPen>
	onCancel: () => void
	onAccept: () => void
	isSaving: boolean
	error: string | null
}

const icons = {
	select: <path d="m5 4 15 6-7 3-3 7L5 4Z" />,
	draw: <path d="M3 14C8 8 13 2 16 4c4 3-13 15-9 16 3 1 10-10 13-9 3 1-6 10-3 10 1 0 3-2 4-3" />,
	text: <path d="M5 7V4h14v3M12 4v16M9 20h6" />,
	comment: <path d="M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5Z" />,
	shapes: (
		<>
			<path d="M17 9a7 7 0 1 0-8 8" />
			<rect x="10" y="9" width="12" height="13" rx="2" />
		</>
	),
	eraser: (
		<>
			<path d="m14 3 7 7a2 2 0 0 1 0 3l-7 8a2 2 0 0 1-3 0l-8-7a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0Z" />
			<path d="m7 7 10 10" />
		</>
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
	const whiteboardColors = getWhiteboardColors(useIsDarkMode())
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
