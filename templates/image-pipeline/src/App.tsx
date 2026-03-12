import { useState } from 'react'
import { createShapeId, Editor, TLComponents, Tldraw, TldrawOptions } from 'tldraw'
import { ImagePipelineSidebar } from './components/ImagePipelineSidebar.tsx'
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
	Toolbar: PipelineToolbar,
}

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)

	return (
		<div className="image-pipeline-layout" style={{ position: 'fixed', inset: 0 }}>
			<div className="image-pipeline-sidebar">
				{editor ? <ImagePipelineSidebar editor={editor} /> : <div />}
			</div>
			<div className="image-pipeline-canvas">
				<Tldraw
					persistenceKey="image-pipeline"
					options={options}
					overrides={overrides}
					shapeUtils={shapeUtils}
					bindingUtils={bindingUtils}
					components={components}
					onMount={(editor) => {
						;(window as any).editor = editor

						setEditor(editor)

						// Create a default pipeline if the canvas is empty
						if (!editor.getCurrentPageShapes().some((s) => s.type === 'node')) {
							createDefaultPipeline(editor)
						}

						editor.user.updateUserPreferences({ isSnapMode: true })

						editor.getStateDescendant('select')!.addChild(PointingPort)

						keepConnectionsAtBottom(editor)

						disableTransparency(editor, ['connection'])
					}}
				/>
			</div>
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
				node: { type: 'model', provider: 'flux', modelId: 'flux-dev' },
			},
		},
		{
			id: promptId,
			type: 'node',
			x: 100,
			y: 450,
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
					seed: Math.floor(Math.random() * 99999),
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
