import { getLicenseKey } from '@tldraw/dotcom-shared'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	ExampleDialog,
	Mat,
	TLComponents,
	Tldraw,
	TldrawUiMenuActionCheckboxItem,
	TldrawUiMenuActionItem,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TLShape,
	track,
	useDialogs,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { trackedShapes, useDebugging } from '../hooks/useDebugging'
import { usePerformance } from '../hooks/usePerformance'
import { A11yResultTable } from './a11y'
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

function A11yAudit() {
	const { addDialog } = useDialogs()

	const runA11yAudit = async () => {
		const axe = (await import('axe-core')).default
		axe.run(document, {}, (err, results) => {
			if (err) throw err

			// eslint-disable-next-line no-console
			console.debug('[a11y]:', results)

			addDialog({
				component: ({ onClose }) => (
					<ExampleDialog
						body={<A11yResultTable results={results} />}
						title="Accessibility Audit Results"
						maxWidth="80vw"
						cancel="Close"
						confirm="Ok"
						onCancel={() => onClose()}
						onContinue={() => onClose()}
					/>
				),
				onClose: () => {
					void null
				},
			})
		})
	}

	return <TldrawUiMenuItem id="a11y-audit" onSelect={runA11yAudit} label={'A11y audit'} />
}

const components: TLComponents = {
	ContextMenu,
	DebugMenu: () => (
		<DefaultDebugMenu>
			<A11yAudit />
			<DefaultDebugMenuContent />
		</DefaultDebugMenu>
	),
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const shape = useValue('shape', () => editor.getOnlySelectedShape(), [editor])
		if (!shape) return null

		return <Shape shape={shape} />
	},
}

const width = 200
const aspectRatio = 16 / 9

const Shape = (props: { shape: TLShape }) => {
	const editor = useEditor()
	const util = editor.getShapeUtil(props.shape.type)
	const box = useValue(
		'transform',
		() => {
			const bounds = editor.getShapeGeometry(props.shape.id).bounds
			const rotation = editor.getShapePageTransform(props.shape.id).decompose().rotation
			const rotatedBounds = editor
				.getShapeGeometry(props.shape.id)
				.transform(Mat.Rotate(rotation)).bounds
			// construct a scale matrix so that rotatedBounds fits inside a width x height box
			const height = width / aspectRatio
			const scaleX = width / rotatedBounds.w
			const scaleY = height / rotatedBounds.h
			const scale = Math.min(scaleX, scaleY) // Use the smaller scale to ensure it fits in both dimensions
			const scaleMatrix = Mat.Scale(scale, scale)

			// Create a translation to top-left the shape by negating the rotated bounds offsets
			const topLeftMatrix = Mat.Translate(-rotatedBounds.x, -rotatedBounds.y)

			// Combine transforms: translate -> rotate -> scale
			const combinedTransform = Mat.Compose(scaleMatrix, topLeftMatrix, Mat.Rotate(rotation))
			// get final bounds so we can center the shape within the parent width/height
			const finalBounds = editor
				.getShapeGeometry(props.shape.id)
				.transform(combinedTransform).bounds

			const centerMatrix = Mat.Translate((width - finalBounds.w) / 2, (height - finalBounds.h) / 2)

			return {
				transform: Mat.toCssString(Mat.Compose(centerMatrix, combinedTransform)),
				width: bounds.w,
				height: bounds.h,
				transformOrigin: 'top left',
			}
		},
		[editor, props.shape.id]
	)
	return (
		<div
			style={{
				position: 'fixed',
				left: 50,
				top: 50,
				outline: '1px solid red',
				width: width,
				height: width / aspectRatio,
			}}
		>
			<div
				style={{
					position: 'absolute',
					...box,
				}}
			>
				{util.component(props.shape)}
			</div>
		</div>
	)
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

					Object.defineProperty(window, '$s', {
						get: function () {
							return editor.getOnlySelectedShape()
						},
						configurable: true,
						enumerable: true,
					})

					const dispose = editor.store.sideEffects.registerAfterChangeHandler(
						'shape',
						afterChangeHandler
					)
					return () => {
						dispose()
					}
				}}
				components={components}
			></Tldraw>
		</div>
	)
}
