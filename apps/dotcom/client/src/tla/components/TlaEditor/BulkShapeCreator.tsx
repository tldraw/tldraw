/* eslint-disable tldraw/jsx-no-literals */
import { useState } from 'react'
import { createShapeId, TLShapeId, TLShapePartial, toRichText, useEditor } from 'tldraw'

const COLORS = ['black', 'blue', 'green', 'red', 'orange', 'violet', 'yellow'] as const
const GEOS = ['rectangle', 'ellipse', 'diamond', 'hexagon', 'triangle'] as const
const LABELS = [
	'Idea',
	'Plan',
	'Goal',
	'Task',
	'Note',
	'Step',
	'First',
	'Next',
	'Then',
	'Done',
	'Input',
	'Output',
]
const TEXT_LINES = [
	'The quick brown fox',
	'Jumps over the lazy dog',
	'Hello, world!',
	'tldraw rocks',
	'A line of text',
	'Another note here',
]

export function BulkShapeCreator() {
	const editor = useEditor()
	const [count, setCount] = useState(100)
	const [isBusy, setIsBusy] = useState(false)

	const handleClick = () => {
		if (isBusy) return
		setIsBusy(true)

		const numArrows = Math.floor(count * 0.2)
		const numText = Math.floor(count * 0.2)
		const numGeos = Math.max(2, count - numArrows - numText)

		const totalCells = numGeos + numText
		const gridSize = Math.max(1, Math.ceil(Math.sqrt(totalCells)))
		const spacing = 180
		const pickIndex = (arr: readonly unknown[]) => Math.floor(Math.random() * arr.length)
		const jitter = (range: number) => (Math.random() - 0.5) * range

		const geoIds: TLShapeId[] = []
		const shapes: TLShapePartial[] = []

		// geos with text labels
		for (let i = 0; i < numGeos; i++) {
			const id = createShapeId()
			geoIds.push(id)
			const cell = i
			const row = Math.floor(cell / gridSize)
			const col = cell % gridSize
			const w = 80 + Math.floor(Math.random() * 100)
			const h = 60 + Math.floor(Math.random() * 80)
			shapes.push({
				id,
				type: 'geo',
				x: col * spacing + jitter(spacing * 0.4),
				y: row * spacing + jitter(spacing * 0.4),
				rotation: Math.random() < 0.2 ? (Math.random() - 0.5) * 0.6 : 0,
				props: {
					w,
					h,
					geo: GEOS[pickIndex(GEOS)],
					color: COLORS[pickIndex(COLORS)],
					fill: Math.random() < 0.7 ? 'semi' : 'solid',
					richText: toRichText(LABELS[pickIndex(LABELS)]),
				},
			})
		}

		// standalone text shapes
		for (let i = 0; i < numText; i++) {
			const cell = numGeos + i
			const row = Math.floor(cell / gridSize)
			const col = cell % gridSize
			shapes.push({
				id: createShapeId(),
				type: 'text',
				x: col * spacing + jitter(spacing * 0.5),
				y: row * spacing + jitter(spacing * 0.5),
				rotation: Math.random() < 0.15 ? (Math.random() - 0.5) * 0.4 : 0,
				props: {
					color: COLORS[pickIndex(COLORS)],
					richText: toRichText(TEXT_LINES[pickIndex(TEXT_LINES)]),
				},
			})
		}

		// arrows connecting random geo shape pairs
		const arrowBindings: { arrowId: TLShapeId; from: TLShapeId; to: TLShapeId }[] = []
		for (let i = 0; i < numArrows && geoIds.length >= 2; i++) {
			const arrowId = createShapeId()
			shapes.push({
				id: arrowId,
				type: 'arrow',
				props: {
					color: COLORS[pickIndex(COLORS)],
					richText: toRichText(Math.random() < 0.3 ? LABELS[pickIndex(LABELS)] : ''),
				},
			})
			const fromIdx = Math.floor(Math.random() * geoIds.length)
			let toIdx = Math.floor(Math.random() * geoIds.length)
			if (toIdx === fromIdx) toIdx = (toIdx + 1) % geoIds.length
			arrowBindings.push({ arrowId, from: geoIds[fromIdx], to: geoIds[toIdx] })
		}

		editor.run(
			() => {
				editor.markHistoryStoppingPoint('bulk shapes')
				editor.createShapes(shapes)
				if (arrowBindings.length) {
					editor.createBindings(
						arrowBindings.flatMap(({ arrowId, from, to }) => [
							{
								fromId: arrowId,
								toId: from,
								type: 'arrow' as const,
								props: {
									terminal: 'start' as const,
									normalizedAnchor: { x: 0.5, y: 0.5 },
									isExact: false,
									isPrecise: false,
								},
							},
							{
								fromId: arrowId,
								toId: to,
								type: 'arrow' as const,
								props: {
									terminal: 'end' as const,
									normalizedAnchor: { x: 0.5, y: 0.5 },
									isExact: false,
									isPrecise: false,
								},
							},
						])
					)
				}
			},
			{ history: 'record' }
		)
		setIsBusy(false)
	}

	const handleAddBoundsRect = () => {
		const vp = editor.getViewportPageBounds()
		const inset = 50
		const previewViewport = {
			x: Math.round(vp.x + inset),
			y: Math.round(vp.y + inset),
			w: Math.round(Math.max(1, vp.w - inset * 2)),
			h: Math.round(Math.max(1, vp.h - inset * 2)),
		}
		const existing = editor
			.getCurrentPageShapes()
			.find((s) => (s.meta as Record<string, unknown>)?.isPreviewBoundsRect === true)
		editor.run(
			() => {
				editor.markHistoryStoppingPoint('preview bounds rect')
				if (existing) {
					editor.updateShape({
						id: existing.id,
						type: 'geo' as const,
						x: previewViewport.x,
						y: previewViewport.y,
						props: { w: previewViewport.w, h: previewViewport.h },
					})
				} else {
					editor.createShape({
						id: createShapeId(),
						type: 'geo',
						x: previewViewport.x,
						y: previewViewport.y,
						meta: { isPreviewBoundsRect: true },
						props: {
							w: previewViewport.w,
							h: previewViewport.h,
							geo: 'rectangle',
							color: 'red',
							fill: 'none',
							dash: 'dashed',
						},
					})
				}
				const settings = editor.getDocumentSettings()
				editor.updateDocumentSettings({
					meta: { ...(settings.meta ?? {}), previewViewport },
				})
			},
			{ history: 'record' }
		)
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 96,
				left: 12,
				display: 'flex',
				gap: 8,
				alignItems: 'center',
				padding: '8px 12px',
				background: 'var(--color-panel, white)',
				color: 'var(--color-text, #000)',
				border: '2px solid var(--color-selected, #1d8df1)',
				borderRadius: 8,
				boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
				fontSize: 12,
				pointerEvents: 'all',
				zIndex: 1000,
			}}
			onPointerDown={(e) => e.stopPropagation()}
			onPointerUp={(e) => e.stopPropagation()}
		>
			<span style={{ fontWeight: 600 }}>Bulk:</span>
			<input
				type="number"
				min={1}
				max={50000}
				value={count}
				disabled={isBusy}
				onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
				style={{ width: 80, padding: '4px 6px' }}
			/>
			<button
				onClick={handleClick}
				disabled={isBusy}
				style={{
					padding: '4px 10px',
					cursor: isBusy ? 'wait' : 'pointer',
				}}
			>
				{isBusy ? 'Adding…' : `Add ${count} shapes`}
			</button>
			<button
				onClick={handleAddBoundsRect}
				style={{ padding: '4px 10px', cursor: 'pointer' }}
				title="Save the current viewport as the document's preview bounds and insert a rectangle marking it"
			>
				Add bounds rect
			</button>
		</div>
	)
}
