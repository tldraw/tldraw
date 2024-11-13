import { getLicenseKey } from '@tldraw/dotcom-shared'
import {
	Box,
	DefaultContextMenu,
	DefaultContextMenuContent,
	TLArrowBinding,
	TLArrowShape,
	TLComponents,
	Tldraw,
	TldrawUiMenuActionCheckboxItem,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	track,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { trackedShapes, useDebugging } from '../hooks/useDebugging'
import { usePerformance } from '../hooks/usePerformance'
import { getDiff } from './diff'

const ContextMenu = track(() => {
	const editor = useEditor()
	const oneShape = editor.getOnlySelectedShape()
	const selectedShapes = editor.getSelectedShapes()
	const tracked = trackedShapes.get()
	return (
		<DefaultContextMenu>
			<DefaultContextMenuContent />
			{selectedShapes.length > 0 && (
				<TldrawUiMenuGroup id="debugging">
					<TldrawUiMenuActionItem actionId="log-shapes" />
					{oneShape && (
						<TldrawUiMenuActionCheckboxItem
							checked={tracked.includes(oneShape.id)}
							actionId="track-changes"
						/>
					)}
				</TldrawUiMenuGroup>
			)}
		</DefaultContextMenu>
	)
})

const components: TLComponents = {
	ContextMenu,
	OnTheCanvas: AllArrowsDebugDisplay,
}

function afterChangeHandler(prev: any, next: any) {
	const tracked = trackedShapes.get()
	if (tracked.includes(next.id)) {
		// eslint-disable-next-line no-console
		console.table(getDiff(prev, next))
	}
}

export default function Develop() {
	const performanceOverrides = usePerformance()
	const debuggingOverrides = useDebugging()
	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				overrides={[performanceOverrides, debuggingOverrides]}
				persistenceKey="example"
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
					const dispose = editor.store.sideEffects.registerAfterChangeHandler(
						'shape',
						afterChangeHandler
					)
					return () => {
						dispose()
					}
				}}
				components={components}
			/>
		</div>
	)
}

const MINIMUM_ARM_LENGTH = 20

interface ArrowDebugInfo {
	expandedBounds: Box
	centerBounds: Box
}

function AllArrowsDebugDisplay() {
	const editor = useEditor()
	const arrowInfos = useValue(
		'arrowShapes',
		() => {
			const results: ArrowDebugInfo[] = []

			editor
				.getCurrentPageShapesSorted()
				.filter((s) => editor.isShapeOfType<TLArrowShape>(s, 'arrow'))
				.forEach((arrow) => {
					const bindings = editor.getBindingsFromShape(arrow, 'arrow') as TLArrowBinding[]
					if (bindings.length === 0) return
					if (bindings.length === 1) return

					const startBinding = bindings.find((b) => b.props.terminal === 'start')
					if (!startBinding) return
					const startShape = editor.getShape(startBinding.toId)
					if (!startShape) return
					const startBounds = editor.getShapePageBounds(startShape)
					if (!startBounds) return

					const endBinding = bindings.find((b) => b.props.terminal === 'end')
					if (!endBinding) return
					const endShape = editor.getShape(endBinding.toId)
					if (!endShape) return
					const endBounds = editor.getShapePageBounds(endShape)
					if (!endBounds) return

					const expandedBounds = Box.Common([startBounds, endBounds]).expandBy(MINIMUM_ARM_LENGTH)
					const centerBounds = Box.FromPoints([startBounds.center, endBounds.center])

					results.push({
						expandedBounds,
						centerBounds,
					})
				})

			return results
		},
		[editor]
	)

	if (arrowInfos.length === 0) return null

	return arrowInfos.map((info) => (
		<ArrowDebugDisplay key={info.expandedBounds.toString()} info={info} />
	))
}

function ArrowDebugDisplay({ info }: { info: ArrowDebugInfo }) {
	const { centerBounds: box1, expandedBounds: box2 } = info
	const box1Corners = box1.corners
	const box2Corners = box2.corners
	return (
		<>
			{box1Corners.map((c) => (
				<Dot key={c.toString()} x={c.x} y={c.y} color="blue" />
			))}
			<Rect x={box1.x} y={box1.y} w={box1.w} h={box1.h} color="red" />
			{box2Corners.map((c) => (
				<Dot key={c.toString()} x={c.x} y={c.y} color="red" />
			))}
			<Rect x={box2.x} y={box2.y} w={box2.w} h={box2.h} color="blue" />
			<Dot x={box1.x} y={box2.y} color="orange" />
			<Dot x={box2.x} y={box1.y} color="orange" />
			<Dot x={box1.x} y={box2.maxY} color="orange" />
			<Dot x={box2.maxX} y={box1.maxY} color="orange" />
			<Dot x={box1.maxY} y={box2.maxY} color="orange" />
			<Dot x={box1.maxX} y={box2.y} color="orange" />
			<Dot x={box2.maxX} y={box1.y} color="orange" />
			<Dot x={box2.x} y={box1.maxY} color="orange" />
		</>
	)
}

function Dot({ x, y, color }: { x: number; y: number; color: string }) {
	return (
		<div
			style={{
				width: 8,
				height: 8,
				background: color,
				borderRadius: '100%',
				position: 'absolute',
				transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
			}}
		/>
	)
}

function Rect({
	x,
	y,
	w,
	h,
	color,
}: {
	x: number
	y: number
	w: number
	h: number
	color: string
}) {
	return (
		<div
			style={{
				width: w,
				height: h,
				border: `2px dashed ${color}`,
				position: 'absolute',
				transform: `translate(${x}px, ${y}px)`,
			}}
		/>
	)
}
