import {
	createShapeId,
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultStylePanel,
	Editor,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiToolbar,
	useEditor,
	useValue,
} from 'tldraw'
import { OnCanvasNodePicker } from './components/OnCanvasNodePicker.tsx'
import { PipelineRegions } from './components/PipelineRegions.tsx'
import { overrides, PipelineToolbar } from './components/PipelineToolbar.tsx'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { disableTransparency } from './disableTransparency.tsx'
import { NodeShapeUtil } from './nodes/NodeShapeUtil'
import { PointingPort } from './ports/PointingPort'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<OnCanvasNodePicker />
			<PipelineRegions />
		</>
	),
	Toolbar: () => (
		<>
			<PipelineToolbar />
			<div className="tlui-main-toolbar tlui-main-toolbar--horizontal">
				<TldrawUiToolbar className="tlui-main-toolbar__tools" label="Actions">
					<DefaultQuickActions />
					<DefaultActionsMenu />
				</TldrawUiToolbar>
			</div>
		</>
	),

	MenuPanel: () => null,
	StylePanel: () => {
		const editor = useEditor()
		const shouldShowStylePanel = useValue(
			'shouldShowStylePanel',
			() => {
				return (
					!editor.isIn('select') ||
					editor.getSelectedShapes().some((s) => s.type !== 'node' && s.type !== 'connection')
				)
			},
			[editor]
		)
		if (!shouldShowStylePanel) return
		return <DefaultStylePanel />
	},
}

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="image-pipeline"
				options={options}
				overrides={overrides}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editor) => {
					;(window as any).editor = editor

					// Create a default pipeline if the canvas is empty
					if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
						createDefaultPipeline(editor)
					}

					editor.user.updateUserPreferences({ isSnapMode: true })

					editor.getStateDescendant('select')!.addChild(PointingPort)

					keepConnectionsAtBottom(editor)

					disableTransparency(editor, ['node', 'connection'])
				}}
			/>
		</div>
	)
}

/**
 * Create a default text-to-image pipeline to get users started.
 */
function createDefaultPipeline(editor: Editor) {
	const modelId = createShapeId()
	const promptId = createShapeId()
	const generateId = createShapeId()
	const previewId = createShapeId()

	editor.createShapes([
		{
			id: modelId,
			type: 'node',
			x: 100,
			y: 200,
			props: {
				node: { type: 'model', modelId: 'sdxl' },
			},
		},
		{
			id: promptId,
			type: 'node',
			x: 100,
			y: 380,
			props: {
				node: {
					type: 'prompt',
					text: 'a photo of a cat sitting on a windowsill',
				},
			},
		},
		{
			id: generateId,
			type: 'node',
			x: 450,
			y: 200,
			props: {
				node: {
					type: 'generate',
					steps: 20,
					cfgScale: 7,
					seed: 42,
					lastResultUrl: null,
				},
			},
		},
		{
			id: previewId,
			type: 'node',
			x: 800,
			y: 200,
			props: {
				node: {
					type: 'preview',
					lastImageUrl: null,
				},
			},
		},
	])
}

export default App
